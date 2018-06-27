import unittest
import hail as hl
import generator.generator.generator as generator

class GeneratorTestSuite(unittest.TestCase):
    def setUp(self):
        rows = [{'global_position': 100, 'neg_log_pval': 1, 'color': "#F73A12"},
        {'global_position': 250, 'neg_log_pval': 4, 'color': "#F73A12"},
        {'global_position': 280, 'neg_log_pval': 2, 'color': "#F73A12"},
        {'global_position': 295, 'neg_log_pval': 6, 'color': "#F73A12"}]

        schema = hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64, color=hl.tstr)

        ht = hl.Table.parallelize(rows, schema, key='global_position')
        table_path = "/Users/maccum/manhattan/data/test_ht.ht"
        ht.write(table_path, overwrite=True)
        self.gen = generator.Generator("root_folder", table_path, regenerate=False)

    def test_generator(self):
        self.assertTrue(self.gen.max_position == 295)
        self.assertTrue(self.gen.max_nlp == 6)

    def test_check_schema(self):
        self.assertTrue(self.gen.checkSchema())

    def test_map_x_values(self):
        self.assertEqual(self.gen.mapValueOntoIncreasingPositiveRange(9, [5,10], [10,20]), 18)

    def test_map_y_values(self):
        self.assertEqual(self.gen.mapValueOntoDecreasingNegativeRange(3, [2.5,5], [-10, -15]), -14)

    def test_get_graph_coordinates(self):
        self.assertEqual(self.gen.getGraphCoordinates(0, 0), [-256,0])
        self.assertEqual(self.gen.getGraphCoordinates(6, 147.5), [-192, 128])
        self.assertEqual(self.gen.getGraphCoordinates(3, 0), [-224, 0])

    def test_foo(self):
        x = generator.Generator("root_folder", "/Users/maccum/manhattan/data/test_ht.ht", 
        regenerate=False, max_position=300, max_nlp=10)
        self.assertEqual(x.getGraphCoordinates(0, 0), [-256, 0])
        self.assertEqual(x.getGraphCoordinates(10, 300), [-192, 256])
        self.assertEqual(x.getGraphCoordinates(5, 150), [-224, 128])

    def test_rounded_tile_coordinates(self):
        pass
    
    def test_filter_table_by_pixel(self):
        pass
    
    def test_calculate_x_range(self):
        pass

    def test_calculate_y_range(self):
        pass
    

