import unittest
import hail as hl
from generator.generator import Generator

class GeneratorTestSuite(unittest.TestCase):
    def setUp(self):
        rows = [{'global_position': 100, 'neg_log_pval': 1, 'color': "#F73A12"},
        {'global_position': 250, 'neg_log_pval': 4, 'color': "#F73A12"},
        {'global_position': 280, 'neg_log_pval': 2, 'color': "#F73A12"},
        {'global_position': 295, 'neg_log_pval': 6, 'color': "#F73A12"}]

        schema = hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr)

        ht = hl.Table.parallelize(rows, schema, key='global_position')
        table_path = "table.ht"
        ht.write(table_path, overwrite=True)
        self.g = Generator("root_folder", table_path, regenerate=False)

    def test_check_schema(self):
        self.assertTrue(self.g.checkSchema())

    def test_map_x_values(self):
        self.assertEqual(self.g.mapValueOntoIncreasingPositiveRange(9, [5,10], [10,20]), 18)
        