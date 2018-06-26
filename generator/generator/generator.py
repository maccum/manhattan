import hail as hl
import hail.expr.aggregators as agg
import os
import math
from math import log, isnan
import matplotlib
import matplotlib.pyplot as plt
import numpy as np

class Generator:

    def __init__(self, root_folder, table_path, new_log_file=False, regenerate=False):
        self.root_folder = root_folder
        self.new_log_file = new_log_file
        self.regenerate = regenerate
        self.ht = hl.read_table(table_path)
        self.colors = {1 : "#F73A12", 2 : "#BFF712", 3 : "#F7B912", 4 : "#F78112", 
                5 : "#1DA14F", 6 : "#651DA1", 7 : "#26DAE3", 8 : "#768CCC", 
                9 : "#CF19EC", 10 : "#A11D7F", 11 : "#EC195C", 12 : "#19EC43", 
                13 : "#30666F", 14 : "#F7CA48", 15 : "#48F770", 16 : "#7A48F7", 
                17 : "#F74863", 18 : "#322C2D", 19 : "#B9C147", 20 : "#B7B0B1", 
                21 : "#64C1B9", 22 : "#349C21", 23 : "#2D396E", 24 : "#5CAEC8"}

        assert(self.checkSchema(self.ht), "bad schema")

    def checkSchema(self, table):
        #TODO
        return True

    def makeDirectories(self, root_folder, zoom):
        column_range = range(0, int(math.sqrt(4**zoom)))
        zoom_directory = root_folder + "/" +str(zoom)
        if not os.path.exists(zoom_directory):
            os.makedirs(zoom_directory)
        
        for c in column_range:
            if not os.path.exists(zoom_directory+"/"+str(c)):
                os.makedirs(zoom_directory+"/"+str(c))

    def generateTileImage(self, filepath, xrange, yrange):
        filtered_ht = self.ht.filter(self.ht.global_position >= xrange[0] & 
        self.ht.global_position <= xrange[1] & self.ht.neg_log_pval >= yrange[0] &
        self.ht.neg_log_pval <= yrange[1])

        positions, neg_log_pvals = self.collectValues(filtered_ht)

        fig = plt.figure(figsize=(2.56, 2.56))
        ax=fig.add_axes([0,0,1,1])
        ax.set_axis_off()
        ax.scatter(positions, neg_log_pvals, c=self.colors, s=4)
        ax.set_ylim(yrange)
        ax.set_xlim(xrange)

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
        collected = table.collect()
        for i in range(0, len(collected)):
            positions[i] = collected[i].global_position
            neg_log_pvals[i] = collected[i].neg_log_pval
        return (positions, neg_log_pvals)

    def generate(self, zoom):
        self.makeDirectories(self.root_folder, zoom)

        write_method = 'w' if self.new_log_file else 'a'
        log = open("plot_generation.log", write_method)
        log.write("INFO: generating plots for zoom level : "+ str(zoom)+"\n")

        total_tiles = 4**zoom
        num_cols = int(math.sqrt(total_tiles))
        num_rows = int(num_cols/4)
        total_rows = num_cols

        max_position = self.ht.aggregate(agg.max(self.ht.global_position))
        max_neg_log_pval = self.ht.aggregate(agg.max(self.ht.neg_log_pval))
        
        #positions, neg_log_pvals = self.collectValues(self.ht)
                
        for c in range(0, num_cols):
            for r in range(total_rows-num_rows, total_rows):
                tile_width = max_position/num_cols
                (x_min, x_max) = self.calculateXRange(c, tile_width, 0)
                
                tile_height = max_neg_log_pval/num_rows
                (y_min, y_max) = self.calculateYRange(r, total_rows, tile_height, 0)
                
                filepath = self.root_folder+"/"+str(zoom)+"/"+str(c)+"/"+str(r)+".png"
                
                if not os.path.isfile(filepath) and not self.regenerate:
                    self.generateTileImage(filepath, [x_min, x_max], [y_min, y_max])
                    log.write("INFO : generated plot "+filepath+"\n")
                else:
                    log.write("Plot "+filepath+" already exists. Not regenerated.\n")
        
        log.close()
    
    def generateAll(self, zoom_min, zoom_max):
        for zoom in range(zoom_min, zoom_max+1):
            self.generate(zoom)