import unittest
from plotgen.src.hail_processor.table_utils import TableUtils

import hail as hl

class TableUtilsSuite(unittest.TestCase):
    def setUp(self):
        pass

    def test_check_schema(self):
        ht = hl.utils.range_table(4)
        self.assertTrue(TableUtils.check_schema(ht, ['idx']))
        self.assertFalse(TableUtils.check_schema(ht, ['idx', 'foo']))
        
    def test_get_max_values(self):
        rows = [{'global_position': 5, 'neg_log_pval': 1.0},
                {'global_position': 2, 'neg_log_pval': 11.5},
                {'global_position': 4, 'neg_log_pval': 19.6},
                {'global_position': 16, 'neg_log_pval': 35.1},
                {'global_position': 11, 'neg_log_pval': 200.23}]
        ht = hl.Table.parallelize(rows, hl.tstruct(global_position=hl.tint64, neg_log_pval=hl.tfloat64))
        
        max_gp, max_nlp = TableUtils.get_max_values(ht)
        self.assertEqual(max_gp, 16)
        self.assertEqual(max_nlp, 200.23)