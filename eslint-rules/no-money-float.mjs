const MONEY_RE = /^(amount|balance|price|cost|value|total|budget|minor)/i;

function isMoneyRef(node) {
  if (!node) return false;
  if (node.type === "Identifier") return MONEY_RE.test(node.name);
  if (node.type === "MemberExpression") return MONEY_RE.test(node.property?.name || "");
  if (node.type === "TSNonNullExpression" || node.type === "TSAsExpression")
    return isMoneyRef(node.expression);
  return false;
}

function isFloatLiteral(node) {
  return (
    node &&
    node.type === "Literal" &&
    typeof node.value === "number" &&
    !Number.isInteger(node.value)
  );
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Ban float arithmetic on money values (use bigint minor units)",
    },
    messages: {
      float: "Float arithmetic on money value '{{name}}'. Use bigint minor units.",
      parse: "parseFloat/Number on money value '{{name}}'. Use bigint minor units.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        const ops = new Set(["+", "-", "*", "/", "%"]);
        if (!ops.has(node.operator)) return;
        const floatSide = isFloatLiteral(node.left) ? node.left : isFloatLiteral(node.right) ? node.right : null;
        if (!floatSide) return;
        const moneySide = isMoneyRef(node.left) ? node.left : isMoneyRef(node.right) ? node.right : null;
        if (moneySide) {
          context.report({ node, messageId: "float", data: { name: moneySide.name ?? moneySide.property?.name ?? "value" } });
        }
      },
      CallExpression(node) {
        const callee = node.callee.type === "Identifier" ? node.callee.name : "";
        if (!["parseFloat", "Number"].includes(callee)) return;
        if (node.arguments.length !== 1) return;
        const arg = node.arguments[0];
        if (isMoneyRef(arg)) {
          context.report({ node, messageId: "parse", data: { name: arg.name ?? arg.property?.name ?? "value" } });
        }
      },
    };
  },
};