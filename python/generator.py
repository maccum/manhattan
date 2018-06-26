import hail as hl
import hail.expr.aggregators as agg
import os

import math
from math import log, isnan

import matplotlib
import matplotlib.pyplot as plt

import numpy as np


class Generator:

    def __init__(root_folder, axes_start_at_zero=True, new_log_file=False, regenerate=False):
        self.root_folder = root_folder
        self.axes_start_at_zero = axes_start_at_zero
        self.new_log_file = new_log_file
        self.regenerate = regenerate
        self.mt = None

    def checkSchema():
        

    def generate(zoom, matrix_table_path):
        self.mt = hl.read_matrix_table(matrix_table_path)
        



def calculateXRange(column, tile_width, parent_min):
    x_min = tile_width * column + parent_min
    x_max = x_min + tile_width
    return (x_min, x_max)

def calculateYRange(row, total_rows, tile_height, parent_min):
    rows_from_bottom = (total_rows - 1) - row
    y_min = tile_height * rows_from_bottom + parent_min
    y_max = y_min + tile_height
    return (y_min, y_max)
    
# generate all plots for a given zoom level
def generatePlots(zoom, folder, positions, neg_log_pvals, 
                  max_position, max_neg_log_pval, plot_colors, axes_start_at_zero=True, new_log=False, regenerate=False):
    if axes_start_at_zero==False : 
        raise NotImplementedError('plot generation with non-zero starting positions for axes is not yet implemented')
    
    write_operation = 'w' if new_log else 'a'
    log = open("plot_generation.log", write_operation)
    
    log.write("INFO: generating plots for zoom level : "+ str(zoom)+"\n")
    
    total_tiles = 4**zoom
    num_cols = int(math.sqrt(total_tiles))
    num_rows = int(num_cols/4)
    total_rows = num_cols
            
    for c in range(0, num_cols):
        for r in range(total_rows-num_rows, total_rows):
            tile_width = max_position/num_cols
            (x_min, x_max) = calculateXRange(c, tile_width, 0)
            
            tile_height = max_neg_log_pval/num_rows
            (y_min, y_max) = calculateYRange(r, total_rows, tile_height, 0)
            
            filepath = folder+"/"+str(zoom)+"/"+str(c)+"/"+str(r)+".png"
            
            if not os.path.isfile(filepath) and not regenerate:
                generateTileImage(filepath, positions, neg_log_pvals, plot_colors, [x_min, x_max], [y_min, y_max])
                log.write("INFO : generated plot "+filepath+"\n")
            else:
                log.write("Plot "+filepath+" already exists. Not regenerated.\n")
    
    log.close()
            
def generateTileImage(filepath, positions, neg_log_pvals, plot_colors, xrange, yrange):
    fig = plt.figure(figsize=(2.56, 2.56))
    ax=fig.add_axes([0,0,1,1])
    ax.set_axis_off()
    ax.scatter(positions, neg_log_pvals, c=plot_colors, s=4)
    ax.set_ylim(yrange)
    ax.set_xlim(xrange)

    plt.savefig(filepath, dpi=100)
    #plt.show()
    plt.close()

def makeDirectories(root_folder, zoom):
    column_range = range(0, int(math.sqrt(4**zoom)))
    zoom_directory = root_folder + "/" +str(zoom)
    if not os.path.exists(zoom_directory):
        os.makedirs(zoom_directory)
    
    for c in column_range:
        if not os.path.exists(zoom_directory+"/"+str(c)):
            os.makedirs(zoom_directory+"/"+str(c))