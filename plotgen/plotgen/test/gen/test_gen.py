import unittest
import random
import numpy as np

from plotgen.src.gen.gen import PlotGenerator
import plotgen.src.utils.constants as constants

import hail as hl

class PlotGeneratorSuite(unittest.TestCase):
    def setUp(self):
        self.global_positions = random.sample(range(1, 300), 10)
        self.neg_log_pvals = list(np.random.uniform(0, 200, 10))
        self.colors = random.choices(list(constants.colors.values()), k=10)
        self.table_path = 'plotgen/test/test_resources/random_table.ht'
        rows = []
        for i in range(len(self.global_positions)):
            row = {'global_position': self.global_positions[i], 'neg_log_pval': self.neg_log_pvals[i],
                   'color': self.colors[i]}
            rows.append(row)
        ht = hl.Table.parallelize(rows, hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr))
        ht.write(self.table_path, overwrite=True)

        self.pg = PlotGenerator('plotgen/test/test_resources/plot_root_folder', regenerate=False,
                           table_path=self.table_path)

    def test_map_value_onto_range(self):
        self.assertEqual(PlotGenerator.map_value_onto_range(9, [5,10], [10, 20]), 18)
        self.assertEqual(PlotGenerator.map_value_onto_range(9, [5,10], [-10, -20]), -18)
        self.assertEqual(PlotGenerator.map_value_onto_range(9, [5,10], [-5, 5]), 3)
        self.assertEqual(PlotGenerator.map_value_onto_range(9, [5,10], [5, -5]), -3)
        self.assertEqual(PlotGenerator.map_value_onto_range(-9, [-5, -10], [10, 20]), 18)
        self.assertEqual(PlotGenerator.map_value_onto_range(3, [2.5, 5], [-15, -10]), -14)

    def test_range_of_axes(self):
        self.assertEqual(self.pg.x_axis_range, [-5, max(self.global_positions)+5])
        self.assertEqual(self.pg.y_axis_range, [0, max(self.neg_log_pvals)+1])

    def test_calculate_gp_range(self):
        global_positions = [0, 11, 26, 34, 49, 63]
        neg_log_pvals = [3.4, 10.5, 2, 8.9, 1.6, 4.7]

        rows = []
        for i in range(len(global_positions)):
            row = {'global_position': global_positions[i], 'neg_log_pval': neg_log_pvals[i], 'color': '#F73A12'}
            rows.append(row)

        table_path = 'plotgen/test/test_resources/table.ht'
        ht = hl.Table.parallelize(rows, hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr))
        ht.write(table_path, overwrite=True)

        pg = PlotGenerator('blah', regenerate=False, table_path = table_path, x_axis_range=[0,63], y_axis_range=[1.6, 10.5])
        self.assertEqual(pg.calculate_gp_range(column=0, num_cols=3), (0,21))
        self.assertEqual(pg.calculate_gp_range(column=1, num_cols=3), (21, 42))
        self.assertEqual(pg.calculate_gp_range(column=2, num_cols=3), (42, 63))

        pg = PlotGenerator('blah', regenerate=False, table_path = table_path)
        x_min = pg.x_axis_range[0]
        x_span = pg.x_axis_range[1]-pg.x_axis_range[0]
        self.assertEqual(pg.calculate_gp_range(column=0, num_cols=3), (x_min, x_span/3+x_min))
        self.assertEqual(pg.calculate_gp_range(column=1, num_cols=3), (x_span/3+x_min, (x_span/3)*2+x_min))
        self.assertEqual(pg.calculate_gp_range(column=2, num_cols=3), ((x_span/3)*2+x_min, (x_span+x_min)))

    def test_calculate_nlp_range(self):
        global_positions = [0, 11, 26, 34, 49, 63]
        neg_log_pvals = [3.4, 10.5, 2, 8.9, 1.6, 4.7]

        rows = []
        for i in range(len(global_positions)):
            row = {'global_position': global_positions[i], 'neg_log_pval': neg_log_pvals[i], 'color': '#F73A12'}
            rows.append(row)

        table_path = 'plotgen/test/test_resources/table.ht'
        ht = hl.Table.parallelize(rows, hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr))
        ht.write(table_path, overwrite=True)

        # recall the row numbers go down, so with 8 total rows and 2 generated rows, the row indices are 6 and 7
        pg = PlotGenerator('blah', regenerate=False, table_path = table_path, x_axis_range=[-5,68], y_axis_range=[0, 12])
        self.assertEqual(pg.calculate_nlp_range(row=6, total_rows = 8, num_rows=2), (6,12))
        self.assertEqual(pg.calculate_nlp_range(row=7, total_rows = 8, num_rows=2), (0, 6))

        pg = PlotGenerator('blah', regenerate=False, table_path = table_path)
        y_min = pg.y_axis_range[0]
        y_span = pg.y_axis_range[1]-pg.y_axis_range[0]
        self.assertEqual(pg.calculate_nlp_range(row=6, total_rows = 8, num_rows=2), (y_span/2+y_min, y_span+y_min))
        self.assertEqual(pg.calculate_nlp_range(row=7, total_rows = 8, num_rows=2), (y_min,y_span/2+y_min))