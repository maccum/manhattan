import unittest
import random
import numpy as np

import hail as hl

from src.plotgen.plot_generator import PlotGenerator
import src.plotgen.constants as constants

class PlotGeneratorSuite(unittest.TestCase):
    def setUp(self):
        self.temp_path = 'test_resources/temp'

        # example 1 (random)
        self.global_positions = random.sample(range(1, 300), 10)
        self.neg_log_pvals = list(np.random.uniform(0, 200, 10))
        self.colors = random.choices(list(constants.colors.values()), k=10)
        self.random_table_path = 'test_resources/random_table.ht'
        rows = []
        for i in range(len(self.global_positions)):
            row = {'global_position': self.global_positions[i], 'neg_log_pval': self.neg_log_pvals[i],
                   'color': self.colors[i]}
            rows.append(row)
        ht = hl.Table.parallelize(rows, hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr))
        ht.write(self.random_table_path, overwrite=True)
        self.pg = PlotGenerator('test_resources/plot_root_folder', regenerate=False,
                                table_path=self.random_table_path)

        # example 2
        global_positions = [0, 11, 26, 34, 49, 63]
        neg_log_pvals = [3.4, 10.5, 2, 8.9, 1.6, 4.7]
        rows = []
        for i in range(len(global_positions)):
            row = {'global_position': global_positions[i], 'neg_log_pval': neg_log_pvals[i], 'color': '#F73A12'}
            rows.append(row)

        self.table_path = 'test_resources/table.ht'
        ht = hl.Table.parallelize(rows, hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr))
        ht.write(self.table_path, overwrite=True)

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
        # test when axis range is specified
        pg = PlotGenerator('blah', regenerate=False, table_path = self.table_path, x_axis_range=[0,63], y_axis_range=[1.6, 10.5])
        self.assertEqual(pg.calculate_gp_range(column=0, num_cols=3), (0,21))
        self.assertEqual(pg.calculate_gp_range(column=1, num_cols=3), (21, 42))
        self.assertEqual(pg.calculate_gp_range(column=2, num_cols=3), (42, 63))

        # test when axis range not specified
        pg = PlotGenerator('blah', regenerate=False, table_path = self.table_path)
        x_min = pg.x_axis_range[0]
        x_span = pg.x_axis_range[1]-pg.x_axis_range[0]
        self.assertEqual(pg.calculate_gp_range(column=0, num_cols=3), (x_min, x_span/3+x_min))
        self.assertEqual(pg.calculate_gp_range(column=1, num_cols=3), (x_span/3+x_min, (x_span/3)*2+x_min))
        self.assertEqual(pg.calculate_gp_range(column=2, num_cols=3), ((x_span/3)*2+x_min, (x_span+x_min)))

    def test_calculate_nlp_range(self):
        # recall the row numbers go down, so with 8 total rows and 2 generated rows, the row indices are 6 and 7

        # test when axis range is specified
        pg = PlotGenerator('blah', regenerate=False, table_path = self.table_path, x_axis_range=[-5,68], y_axis_range=[0, 12])
        self.assertEqual(pg.calculate_nlp_range(row=6, total_rows = 8, num_rows=2), (6,12))
        self.assertEqual(pg.calculate_nlp_range(row=7, total_rows = 8, num_rows=2), (0, 6))

        # test when axis range not specified
        pg = PlotGenerator('blah', regenerate=False, table_path = self.table_path)
        y_min = pg.y_axis_range[0]
        y_span = pg.y_axis_range[1]-pg.y_axis_range[0]
        self.assertEqual(pg.calculate_nlp_range(row=6, total_rows = 8, num_rows=2), (y_span/2+y_min, y_span+y_min))
        self.assertEqual(pg.calculate_nlp_range(row=7, total_rows = 8, num_rows=2), (y_min,y_span/2+y_min))

    def test_construct_file_path(self):
        self.assertEqual(self.pg.construct_file_path([2, 0, 3]), self.pg.root_folder+"/2/0/3.png")

    def test_filter_by_coordinates(self):
        pg = PlotGenerator('blah', regenerate=False, table_path = self.table_path)
        ht = pg.filter_by_coordinates(gp_range=[12, 49], nlp_range=[0, 10]).select('global_position', 'neg_log_pval')
        self.assertEqual(set(ht.collect()), {hl.struct(global_position=34, neg_log_pval=8.9).value,
                                             hl.struct(global_position=26, neg_log_pval=2.0).value,
                                             hl.struct(global_position=49, neg_log_pval=1.6).value})

    def test_filter_by_pixel(self):
        global_positions = [15000, 15001]
        neg_log_pvals = [250.5, 250.7]
        rows = []
        for i in range(len(global_positions)):
            row = {'global_position': global_positions[i], 'neg_log_pval': neg_log_pvals[i], 'color': '#F73A12'}
            rows.append(row)
        ht = hl.Table.parallelize(rows, hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr))
        filtered_ht = PlotGenerator.filter_by_pixel(ht, gp_range=[10000, 20000], nlp_range=[150.5, 350.5])
        self.assertTrue(len(filtered_ht.collect())==1)

    def test_collect_values(self):
        ht = hl.read_table(self.table_path)
        global_positions, neg_log_pvals, colors = PlotGenerator.collect_values(ht)
        self.assertEqual(global_positions, [0, 11, 26, 34, 49, 63])
        self.assertEqual(neg_log_pvals, [3.4, 10.5, 2, 8.9, 1.6, 4.7])
        self.assertEqual(colors, ['#F73A12', '#F73A12', '#F73A12', '#F73A12', '#F73A12', '#F73A12'])

    def test_generate_tile_image(self):
        pass

    def test_generate(self):
        pass

    def test_empty_tiles_not_computed(self):
        pass