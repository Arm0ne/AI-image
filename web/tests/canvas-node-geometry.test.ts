import { expect, test } from "bun:test";
import { findContainingGroupId, findGroupDropTarget, snapNodesIntoGroup } from "../src/lib/canvas/canvas-node-geometry";
import { CanvasNodeType, type CanvasNodeData } from "../src/types/canvas";

const group: CanvasNodeData = { id: "group", type: CanvasNodeType.Group, title: "group", position: { x: 0, y: 0 }, width: 400, height: 300 };
const item: CanvasNodeData = { id: "item", type: CanvasNodeType.Image, title: "image", position: { x: 10, y: 20 }, width: 100, height: 100 };

test("overlapping groups retain the topmost drop target without reordering nodes", () => {
    const top = { ...group, id: "top" };
    const nodes = [group, top, item];
    expect(findGroupDropTarget(new Set([item.id]), nodes)).toBe(top);
    expect(findContainingGroupId(item, nodes)).toBe(top.id);
    expect(nodes.map((node) => node.id)).toEqual(["group", "top", "item"]);
});

test("dragging an entire group does not nest it inside another group", () => {
    expect(findGroupDropTarget(new Set([group.id, item.id]), [group, { ...group, id: "other" }, item])).toBeNull();
});

test("moving outside all groups releases membership", () => {
    const outside = { ...item, position: { x: 800, y: 800 }, metadata: { groupId: group.id } };
    expect(findGroupDropTarget(new Set([item.id]), [group, outside])).toBeNull();
    expect(findContainingGroupId(outside, [group, outside])).toBeUndefined();
});

test("multi-selection snapping preserves spacing and does not move unrelated nodes", () => {
    const second = { ...item, id: "second", position: { x: 120, y: 20 } };
    const untouched = { ...item, id: "untouched", position: { x: 800, y: 800 } };
    const result = snapNodesIntoGroup(new Set([item.id, second.id]), [group, item, second, untouched], group);
    expect(result[0]).toBe(group);
    expect(result[3]).toBe(untouched);
    expect(result[2].position.x - result[1].position.x).toBe(110);
    expect(result[1].position).toEqual({ x: 24, y: 24 });
    expect(result[1].metadata?.groupId).toBe(group.id);
    expect(result[2].metadata?.groupId).toBe(group.id);
});
