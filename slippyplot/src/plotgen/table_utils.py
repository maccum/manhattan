import hail.expr.aggregators as agg

class TableUtils:

    @staticmethod
    def check_schema(table, desired_schema=None):
        if desired_schema is None:
            desired_schema = ['global_position', 'neg_log_pval', 'color']
        row_fields = list(table.row)
        for field in desired_schema:
            if field not in row_fields:
                return False
        return True

    @staticmethod
    def get_max_values(table):
        max_gp = table.aggregate(agg.max(table.global_position))
        max_nlp = table.aggregate(agg.max(table.neg_log_pval))
        return (max_gp, max_nlp)