import os
import math
import matplotlib.pyplot as plt
import datetime
import signal

import hail as hl

from slippyplot.src.plotgen.table_utils import TableUtils
import slippyplot.src.plotgen.constants as constants
from slippyplot.src.plotgen.progress import progress
from slippyplot.src.plotgen.zone import Zone, Zones


class PlotGenerator:

    def __init__(self, root_folder, regenerate, table_path, x_axis_range=None, y_axis_range=None):

        self.root_folder = root_folder
        self.regenerate = regenerate
        self.ht = hl.read_table(table_path)

        self.empty_zones = Zones()
        self.empty_tiles = []

        self.log = None

        if x_axis_range is None or y_axis_range is None:
            # axis limits should be set slightly outside the range of x and y values
            max_gp, max_nlp = TableUtils.get_max_values(self.ht)
            self.x_axis_range = [constants.min_gp_to_display, max_gp+constants.distance_above_max_gp_to_display]
            self.y_axis_range = [constants.min_nlp_to_display, max_nlp+constants.distance_above_max_nlp_to_display]
        else:
            self.x_axis_range = x_axis_range
            self.y_axis_range = y_axis_range

        desired_schema = ['global_position', 'neg_log_pval', 'color']
        if not TableUtils.check_schema(self.ht, desired_schema):
            raise ValueError("Expected schema {"+' ,'.join(desired_schema)+"} but found schema {"+' ,'.join(list(self.ht.row))+"}")

    @staticmethod
    def map_value_onto_range(value, old_range, new_range):
        old_span = old_range[1]-old_range[0]
        new_span = new_range[1]-new_range[0]
        distance_to_value = value - old_range[0]
        percent_span_to_value = distance_to_value / old_span
        distance_to_new_value = percent_span_to_value * new_span
        new_value = new_range[0]+distance_to_new_value
        return new_value

    @staticmethod
    def make_directories(root_folder, zoom):
        column_range = range(0, int(math.sqrt(4**zoom)))
        zoom_directory = root_folder + "/" +str(zoom)
        if not os.path.exists(zoom_directory):
            os.makedirs(zoom_directory)

        for c in column_range:
            if not os.path.exists(zoom_directory+"/"+str(c)):
                os.makedirs(zoom_directory+"/"+str(c))

    def calculate_gp_range(self, column, num_cols):
        tile_width = (self.x_axis_range[1] - self.x_axis_range[0])/num_cols
        min_gp = tile_width * column + self.x_axis_range[0]
        max_gp = min_gp + tile_width
        return min_gp, max_gp

    def calculate_nlp_range(self, row, total_rows, num_rows):
        tile_height = (self.y_axis_range[1] - self.y_axis_range[0])/num_rows
        rows_from_bottom = (total_rows - 1) - row
        min_nlp = tile_height * rows_from_bottom
        max_nlp = min_nlp + tile_height
        return min_nlp, max_nlp

    def construct_file_path(self, zcr):
        assert len(zcr) == 3
        zoom, c, r = zcr[0], zcr[1], zcr[2]
        return self.root_folder+"/"+str(zoom)+"/"+str(c)+"/"+str(r)+".png"

    # filter table to the desired zone on the map
    def filter_by_coordinates(self, gp_range, nlp_range):
        assert(len(gp_range)==2 and len(nlp_range)==2)
        return self.ht.filter(
            hl.interval(hl.int64(gp_range[0]), hl.int64(gp_range[1]),
                        includes_start=True, includes_end=True).contains(self.ht.global_position) &
            hl.interval(hl.float64(nlp_range[0]), hl.float64(nlp_range[1]),
                        includes_start=True, includes_end=True).contains(self.ht.neg_log_pval)
        )

    # filter table to have one row per pixel for this tile
    @staticmethod
    def filter_by_pixel(table, gp_range, nlp_range):
        assert(len(gp_range)==2 and len(nlp_range)==2)
        pixel_coordinates_on_tile = [
            hl.floor(PlotGenerator.map_value_onto_range(table.neg_log_pval, nlp_range, [0, 256])),
            hl.floor(PlotGenerator.map_value_onto_range(table.global_position, gp_range, [0, 256]))
        ]
        # fixme : key_by(...).distinct() very slow :(
        return table.annotate(tile_coordinates = pixel_coordinates_on_tile).key_by('tile_coordinates').distinct()

    @staticmethod
    def collect_values(table):
        global_positions = []
        neg_log_pvals = []
        colors = []
        collected = table.collect()
        for i in range(0, len(collected)):
            global_positions.append(collected[i].global_position)
            neg_log_pvals.append(collected[i].neg_log_pval)
            colors.append(collected[i].color)
        return global_positions, neg_log_pvals, colors

    def generate_tile_image(self, zcr, x_range, y_range):
        zone = Zone(x_range, y_range)

        if self.empty_zones.contains(zone):
            # tile will be empty; don't bother filtering table
            self.empty_tiles.append(zcr)
            self.log.write("EMPTY "+self.date()+": empty plot <"+self.construct_file_path(zcr)+">.\n")
            return

        filtered_by_coordinates = self.filter_by_coordinates(x_range, y_range)

        filtered_by_pixel = self.filter_by_pixel(filtered_by_coordinates, x_range, y_range)

        gp, nlp, colors = self.collect_values(filtered_by_pixel)

        if not gp:
            assert not nlp
            # tile is empty; add to empty list
            self.empty_tiles.append(zcr)
            self.empty_zones.append(zone)
            self.log.write("EMPTY "+self.date()+": empty plot <"+self.construct_file_path(zcr)+">.\n")
            return

        self.log.write("GEN "+self.date()+": generated plot <"+self.construct_file_path(zcr)+">.\n")

        fig = plt.figure(figsize=(2.56, 2.56)) # ensure 256 * 256 pixel size by setting dpi=100 when saving fig
        ax=fig.add_axes([0,0,1,1])
        ax.set_axis_off()
        ax.scatter(gp, nlp, c=colors, s=4)
        ax.set_ylim(y_range)
        ax.set_xlim(x_range)

        tile_file_path = self.construct_file_path(zcr)
        plt.savefig(tile_file_path, dpi=100)
        #plt.show()
        plt.close()

    @staticmethod
    def date():
        return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def generate(self, zoom, new_log_file=False, log_file_path='plot_generation.log'):
        signal.signal(signal.SIGINT, self.catch)
        signal.signal(signal.SIGUSR1, self.catch)

        self.make_directories(self.root_folder, zoom)

        write_method = 'w' if new_log_file else 'a'
        self.log = open(log_file_path, write_method)
        self.log.write("ZOOM "+self.date()+": generating plots for zoom level : "+ str(zoom)+".\n")

        # method assumes that map view is restricted to bottom 4th of rows (because manhattan plot is be wide and squat)
        total_tiles = 4**zoom # includes tiles outside view that will not be generated
        num_cols = int(math.sqrt(total_tiles))
        num_rows = int(num_cols/4)
        total_tiles_to_generate = num_cols * num_rows
        total_rows = num_cols

        iteration = 1

        for c in range(0, num_cols):
            for r in range(total_rows-num_rows, total_rows):
                (x_min, x_max) = self.calculate_gp_range(c, num_cols)
                (y_min, y_max) = self.calculate_nlp_range(r, total_rows, num_rows)

                zcr = [zoom, c, r]

                if (not os.path.isfile(self.construct_file_path(zcr))) or self.regenerate:
                    self.generate_tile_image(zcr, [x_min, x_max], [y_min, y_max])
                    progress(iteration, total_tiles_to_generate, prefix='Zoom level: '+str(zoom))
                else:
                    self.log.write("SKIP "+self.date()+": plot <"+self.construct_file_path(zcr)+"> already exists; not regenerated.\n")

                #progress(iteration, total_tiles_to_generate, prefix='Zoom level: '+str(zoom))
                iteration = iteration + 1

        self.log.close()

    def generate_all(self, zoom_min, zoom_max, log_file_path='plot_generation.log'):
        self.generate(zoom_min, new_log_file=True, log_file_path=log_file_path)
        for zoom in range(zoom_min+1, zoom_max+1):
            self.generate(zoom, new_log_file=False, log_file_path=log_file_path)

    def catch(self, signum, frame):
        if self.log is not None:
            self.log.flush()