import hail as hl
import hail.expr.aggregators as agg
import os
import math
import matplotlib.pyplot as plt

class Generator:

    def __init__(self, root_folder, table_path, regenerate):
        self.root_folder = root_folder
        self.regenerate = regenerate
        self.ht = hl.read_table(table_path)
        self.colors = {1 : "#F73A12", 2 : "#BFF712", 3 : "#F7B912", 4 : "#F78112", 
                5 : "#1DA14F", 6 : "#651DA1", 7 : "#26DAE3", 8 : "#768CCC", 
                9 : "#CF19EC", 10 : "#A11D7F", 11 : "#EC195C", 12 : "#19EC43", 
                13 : "#30666F", 14 : "#F7CA48", 15 : "#48F770", 16 : "#7A48F7", 
                17 : "#F74863", 18 : "#322C2D", 19 : "#B9C147", 20 : "#B7B0B1", 
                21 : "#64C1B9", 22 : "#349C21", 23 : "#2D396E", 24 : "#5CAEC8"}

        assert(self.checkSchema(self.ht))

    def checkSchema(self):
        row_schema = self.ht.row
        assert(row_schema.contains('global_position'), "Table missing global_position field.")
        assert(row_schema.contains('neg_log_pval'), "Table missing neg_log_pval field.")
        assert(row_schema.contains('color'), "Table missing color field.")
        return True

    # map positive value from positive range onto positive range
    def mapValueOntoIncreasingPositiveRange(self, value, old_range, new_range):
        new_min, new_max = new_range[0], new_range[1]
        assert(new_min < new_max and new_min >= 0 and new_max > 0)
        new_span = new_max - new_min
        old_min, old_max = old_range[0], old_range[1]
        old_span = old_max - old_min
        assert(old_min < new_min and old_min >= 0 and old_max > 0)
        
        new_value = (((value - old_min) / old_span) * new_span) + new_min
        return new_value
    
    # map positive value from positive range onto negative range
    def mapValueOntoDecreasingNegativeRange(self, value, old_range, new_range):
        new_max, new_min = new_range[0], new_range[1]
        assert(new_max > new_min and new_max <=0 and new_min < 0)
        old_max, old_min = old_range[0], old_range[1]
        assert(old_max > old_min and old_max <= 0 and old_min < 0)
        new_span = abs(new_min)-abs(new_max)
        old_span = abs(old_min)-abs(old_max)
        
        new_value = (((value- old_min) / old_span) * new_span) + new_min
        return new_value

    def getGraphCoordinates(self, neg_log_pval, position):
        y = -(64 - ((neg_log_pval / 11.5) * 64))-192
        x = ((position / (3.05 * 10**9)) * 256)
        return [y, x]

    def getRoundedTileCoordinatesFromGraphCoordinates(self, coords, old_y_range, old_x_range, new_y_range, new_x_range):
        y, x = coords[0], coords[1]
        tile_y = self.mapValueOntoDecreasingNegativeRange(y, old_y_range, new_y_range)
        tile_x = self.mapValueOntoIncreasingPositiveRange(x, old_x_range, new_x_range)
        return [hl.int(tile_y), hl.int(tile_x)]

    def makeDirectories(self, root_folder, zoom):
        column_range = range(0, int(math.sqrt(4**zoom)))
        zoom_directory = root_folder + "/" +str(zoom)
        if not os.path.exists(zoom_directory):
            os.makedirs(zoom_directory)
        
        for c in column_range:
            if not os.path.exists(zoom_directory+"/"+str(c)):
                os.makedirs(zoom_directory+"/"+str(c))

    def filterTableByPixel(self, table, pos_range, pval_range):
        graph_coord_expr = self.getGraphCoordinates(table.neg_log_pval, table.global_position)
        
        old_y_range = [self.mapValueOntoDecreasingNegativeRange(pval_range[0]), 
        self.mapValueOntoDecreasingNegativeRange(pval_range[1])]
        old_x_range = [self.mapValueOntoIncreasingPositiveRange(pos_range[0]),
        self.mapValueOntoIncreasingPositiveRange(pos_range[1])]

        new_x_range = [0,256]
        new_y_range = [0,-256]

        tile_coord_expr = self.getRoundedTileCoordinatesFromGraphCoordinates(
            graph_coord_expr, old_y_range, old_x_range, new_y_range, new_x_range
        )

        with_coords = table.annotate(tile_coord = tile_coord_expr)
        return with_coords.key_by('tile_coord').distinct()

    def generateTileImage(self, filepath, x_range, y_range):
        filtered_by_coordinates = self.ht.filter(
            (self.ht.global_position >= hl.literal(x_range[0])) & 
            (self.ht.global_position <= hl.literal(x_range[1])) & 
            (self.ht.neg_log_pval >= hl.literal(y_range[0])) &
            (self.ht.neg_log_pval <= hl.literal(y_range[1])))

        filtered_by_pixel = self.filterTableByPixel(filtered_by_coordinates, x_range, y_range)

        positions, neg_log_pvals, colors = self.collectValues(filtered_by_pixel)
        
        fig = plt.figure(figsize=(2.56, 2.56))
        ax=fig.add_axes([0,0,1,1])
        ax.set_axis_off()
        ax.scatter(positions, neg_log_pvals, c=colors, s=4)
        ax.set_ylim(y_range)
        ax.set_xlim(x_range)

        plt.savefig(filepath, dpi=100)
        #plt.show()
        plt.close()

    def calculateXRange(self, column, tile_width, parent_min):
        x_min = tile_width * column + parent_min
        x_max = x_min + tile_width
        return (x_min, x_max)

    def calculateYRange(self, row, total_rows, tile_height, parent_min):
        rows_from_bottom = (total_rows - 1) - row
        y_min = tile_height * rows_from_bottom + parent_min
        y_max = y_min + tile_height
        return (y_min, y_max)

    def collectValues(self, table):
        positions = []
        neg_log_pvals = []
        colors = []
        collected = table.collect()
        for i in range(0, len(collected)):
            positions.append(collected[i].global_position)
            neg_log_pvals.append(collected[i].neg_log_pval)
            colors.append(collected[i].color)
        return (positions, neg_log_pvals, colors)

    def generate(self, zoom, new_log_file=False):
        self.makeDirectories(self.root_folder, zoom)

        write_method = 'w' if new_log_file else 'a'
        log = open("plot_generation.log", write_method)
        log.write("INFO: generating plots for zoom level : "+ str(zoom)+"\n")

        total_tiles = 4**zoom
        num_cols = int(math.sqrt(total_tiles))
        num_rows = int(num_cols/4)
        total_rows = num_cols

        max_position = self.ht.aggregate(agg.max(self.ht.global_position))
        max_neg_log_pval = self.ht.aggregate(agg.max(self.ht.neg_log_pval))
                        
        for c in range(0, num_cols):
            for r in range(total_rows-num_rows, total_rows):
                tile_width = max_position/num_cols
                (x_min, x_max) = self.calculateXRange(c, tile_width, 0)
                
                tile_height = max_neg_log_pval/num_rows
                (y_min, y_max) = self.calculateYRange(r, total_rows, tile_height, 0)
                
                filepath = self.root_folder+"/"+str(zoom)+"/"+str(c)+"/"+str(r)+".png"
                
                if (not os.path.isfile(filepath)) or self.regenerate:
                    self.generateTileImage(filepath, [x_min, x_max], [y_min, y_max])
                    log.write("INFO : generated plot "+filepath+"\n")
                else:
                    log.write("Plot "+filepath+" already exists. Not regenerated.\n")
        
        log.close()
    
    def generateAll(self, zoom_min, zoom_max):
        self.generate(zoom_min, new_log_file=True)
        for zoom in range(zoom_min+1, zoom_max+1):
            self.generate(zoom, new_log_file=False)