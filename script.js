let cy;
let root = null;

initCy();

/* ---------------- INIT CYTOSCAPE ---------------- */
function initCy() {
    cy = cytoscape({
        container: document.getElementById("cy"),
        elements: [],
        style: [
            { selector: 'node', style: {
                'label': 'data(label)',
                'background-color': 'data(color)',
                'text-valign': 'center',
                'text-halign': 'center',
                'color': '#fff',
                'width': '50px',
                'height': '50px',
                'font-size': '16px',
                'border-width': 2,
                'border-color': '#000',
                'shape': 'ellipse'
            }},
            { selector: 'edge', style: { 'width': 2, 'line-color': '#555' }},
            { selector: '.highlight', style: { 'border-color': '#ffc107', 'border-width': 4 }}
        ]
    });
}

/* ---------------- NODE CLASS ---------------- */
class Node {
    constructor(value, color="red") {
        this.value = value;
        this.left = null;
        this.right = null;
        this.parent = null;
        this.color = color;
        this.id = "n" + value + "_" + Math.random().toString(36).substr(2,5); // unique ID
    }
}

/* ---------------- INSERTION ---------------- */
async function insertNode() {
    let value = Number(document.getElementById("valueInput").value);
    if (isNaN(value)) return;
    let newNode = new Node(value);
    root = await bstInsert(root, newNode);
    await fixRedRed(newNode);
    root.color = "black";
    await redraw(root);
}

/* ---------------- BST INSERT ---------------- */
async function bstInsert(node, newNode, parent=null) {
    if (!node) { newNode.parent = parent; return newNode; }
    if (newNode.value < node.value) node.left = await bstInsert(node.left, newNode, node);
    else if (newNode.value > node.value) node.right = await bstInsert(node.right, newNode, node);
    else {
        showMessage("Duplicate values not allowed!");
        return node;
    }
    return node;
}

/* ---------------- RED-RED FIX ---------------- */
async function fixRedRed(node) {
    if (!node || !node.parent) return;

    let parent = node.parent;
    let grand = parent.parent;
    let uncle = grand ? (grand.left === parent ? grand.right : grand.left) : null;

    if (parent.color !== "red") return;

    if (uncle && uncle.color === "red") {
        // Recoloring
        parent.color = uncle.color = "black";
        grand.color = "red";
        showMessage(`Recoloring: Parent ${parent.value}, Uncle ${uncle.value} -> Black; Grand ${grand.value} -> Red`);
        await redrawHighlight([grand, parent, uncle]);
        await delay(1500);
        await fixRedRed(grand);
    } else if (grand) {
        // Rotations
        if (parent === grand.left && node === parent.left) {
            showMessage(`LL Rotation at Node ${grand.value}`);
            await redrawHighlight([grand, parent, node]);
            await delay(1500);
            rotateRight(grand);
        } else if (parent === grand.left && node === parent.right) {
            showMessage(`LR Rotation at Node ${grand.value}`);
            await redrawHighlight([grand, parent, node]);
            await delay(1500);
            rotateLeft(parent);
            rotateRight(grand);
        } else if (parent === grand.right && node === parent.right) {
            showMessage(`RR Rotation at Node ${grand.value}`);
            await redrawHighlight([grand, parent, node]);
            await delay(1500);
            rotateLeft(grand);
        } else if (parent === grand.right && node === parent.left) {
            showMessage(`RL Rotation at Node ${grand.value}`);
            await redrawHighlight([grand, parent, node]);
            await delay(1500);
            rotateRight(parent);
            rotateLeft(grand);
        }
    }
}

/* ---------------- ROTATIONS ---------------- */
function rotateLeft(node) {
    let right = node.right;
    node.right = right.left;
    if (right.left) right.left.parent = node;
    right.left = node;

    right.parent = node.parent;
    if (!node.parent) root = right;
    else if (node.parent.left === node) node.parent.left = right;
    else node.parent.right = right;

    node.parent = right;

    let temp = right.color;
    right.color = node.color;
    node.color = temp;
}

function rotateRight(node) {
    let left = node.left;
    node.left = left.right;
    if (left.right) left.right.parent = node;
    left.right = node;

    left.parent = node.parent;
    if (!node.parent) root = left;
    else if (node.parent.left === node) node.parent.left = left;
    else node.parent.right = left;

    node.parent = left;

    let temp = left.color;
    left.color = node.color;
    node.color = temp;
}

/* ----------------- REDRAW ----------------- */
async function redraw(node) {
    cy.elements().remove();
    if (!node) return;
    let elements = [];
    let width = getTreeWidth(node);
    assignPositions(node, 0, width, 50);
    traverse(node, elements);
    cy.add(elements);
}

/* ----------------- POSITIONING ----------------- */
function assignPositions(node, minX, maxX, y) {
    if (!node) return;
    node.y = y;
    let midX = (minX + maxX)/2;
    node.x = midX;
    assignPositions(node.left, minX, midX - 30, y + 100);
    assignPositions(node.right, midX + 30, maxX, y + 100);
}

/* ----------------- TRAVERSAL FOR CYTOSCAPE ---------------- */
function traverse(node, elements) {
    if (!node) return;
    elements.push({ group: "nodes", data: { id: node.id, label: node.value, color: node.color }, position: { x: node.x, y: node.y } });
    if (node.left) elements.push({ group: "edges", data: { source: node.id, target: node.left.id } });
    if (node.right) elements.push({ group: "edges", data: { source: node.id, target: node.right.id } });
    traverse(node.left, elements);
    traverse(node.right, elements);
}

/* ----------------- HIGHLIGHT ---------------- */
async function redrawHighlight(nodes) {
    await redraw(root);
    nodes.forEach(n => cy.$("#" + n.id).addClass("highlight"));
}

/* ---------------- MESSAGES ---------------- */
function showMessage(text) {
    document.getElementById("message").innerText = text;
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

/* ---------------- RESET ---------------- */
function resetTree() {
    root = null;
    cy.elements().remove();
    showMessage("");
}

/* ---------------- DELETE NODE ---------------- */
async function deleteNode() {
    let value = Number(document.getElementById("valueInput").value);
    if (isNaN(value) || !root) return;
    root = await deleteBST(root, value);
    if (root) root.color = "black";
    showMessage(`Deleted Node ${value}`);
    await redraw(root);
}

async function deleteBST(node, value) {
    if (!node) return null;
    if (value < node.value) node.left = await deleteBST(node.left, value);
    else if (value > node.value) node.right = await deleteBST(node.right, value);
    else {
        if (!node.left) return node.right;
        else if (!node.right) return node.left;
        let minNode = node.right;
        while (minNode.left) minNode = minNode.left;
        node.value = minNode.value;
        node.right = await deleteBST(node.right, minNode.value);
    }
    return node;
}

/* ----------------- TREE WIDTH ESTIMATION ---------------- */
function getTreeWidth(node) {
    if (!node) return 100;
    let leftWidth = getTreeWidth(node.left);
    let rightWidth = getTreeWidth(node.right);
    return Math.max(leftWidth + rightWidth + 40, 200);
}
