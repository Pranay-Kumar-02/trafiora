"""PostgreSQL EXPLAIN (FORMAT JSON) Execution Plan Tree Parser & Node Classifier."""
from typing import Any


class PlanNode:
    """Represents an execution plan node in the parsed hierarchy."""

    def __init__(
        self,
        node_type: str,
        relation_name: str | None,
        startup_cost: float,
        total_cost: float,
        plan_rows: int,
        plan_width: int,
        filter_expr: str | None,
        index_name: str | None,
        plans: list["PlanNode"] | None = None,
        shared_hit_blocks: int = 0,
        shared_read_blocks: int = 0,
    ) -> None:
        self.node_type = node_type
        self.relation_name = relation_name
        self.startup_cost = startup_cost
        self.total_cost = total_cost
        self.plan_rows = plan_rows
        self.plan_width = plan_width
        self.filter_expr = filter_expr
        self.index_name = index_name
        self.plans = plans or []
        self.shared_hit_blocks = shared_hit_blocks
        self.shared_read_blocks = shared_read_blocks

    def to_dict(self) -> dict[str, Any]:
        return {
            "node_type": self.node_type,
            "relation_name": self.relation_name,
            "startup_cost": self.startup_cost,
            "total_cost": self.total_cost,
            "plan_rows": self.plan_rows,
            "plan_width": self.plan_width,
            "filter_expr": self.filter_expr,
            "index_name": self.index_name,
            "shared_hit_blocks": self.shared_hit_blocks,
            "shared_read_blocks": self.shared_read_blocks,
            "plans": [p.to_dict() for p in self.plans],
        }


class ExplainPlanParser:
    """Parses raw JSON EXPLAIN plans and extracts bottleneck diagnostics."""

    def parse(self, raw_plan_json: list[dict[str, Any]] | dict[str, Any]) -> dict[str, Any]:
        """Parses PostgreSQL EXPLAIN JSON structure."""
        if isinstance(raw_plan_json, list):
            if not raw_plan_json:
                raise ValueError("Empty EXPLAIN plan list")
            root_container = raw_plan_json[0]
        else:
            root_container = raw_plan_json

        raw_plan = root_container.get("Plan", root_container)
        root_node = self._build_node(raw_plan)

        # Collect summary diagnostics
        all_nodes: list[PlanNode] = []
        self._flatten(root_node, all_nodes)

        seq_scans = [
            n for n in all_nodes
            if n.node_type == "Seq Scan" and n.plan_rows >= 500
        ]
        total_hit = sum(n.shared_hit_blocks for n in all_nodes)
        total_read = sum(n.shared_read_blocks for n in all_nodes)
        buffer_hit_ratio = (
            (total_hit / (total_hit + total_read)) if (total_hit + total_read) > 0 else 1.0
        )

        return {
            "root_node": root_node.to_dict(),
            "total_cost": root_node.total_cost,
            "node_count": len(all_nodes),
            "sequential_scan_count": len(seq_scans),
            "has_high_cost_seq_scan": len(seq_scans) > 0,
            "flagged_tables": [n.relation_name for n in seq_scans if n.relation_name],
            "buffer_hit_ratio": buffer_hit_ratio,
        }

    def _build_node(self, d: dict[str, Any]) -> PlanNode:
        children = [self._build_node(child) for child in d.get("Plans", [])]
        return PlanNode(
            node_type=d.get("Node Type", "Unknown"),
            relation_name=d.get("Relation Name"),
            startup_cost=float(d.get("Startup Cost", 0.0)),
            total_cost=float(d.get("Total Cost", 0.0)),
            plan_rows=int(d.get("Plan Rows", 0)),
            plan_width=int(d.get("Plan Width", 0)),
            filter_expr=d.get("Filter"),
            index_name=d.get("Index Name"),
            plans=children,
            shared_hit_blocks=int(d.get("Shared Hit Blocks", 0)),
            shared_read_blocks=int(d.get("Shared Read Blocks", 0)),
        )

    def _flatten(self, node: PlanNode, out_list: list[PlanNode]) -> None:
        out_list.append(node)
        for child in node.plans:
            self._flatten(child, out_list)


plan_parser = ExplainPlanParser()
