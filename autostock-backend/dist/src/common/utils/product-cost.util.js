"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitsPerCartonValue = unitsPerCartonValue;
exports.effectiveCartonCost = effectiveCartonCost;
exports.pieceUnitCostFromCarton = pieceUnitCostFromCarton;
exports.pieceUnitCostFromProduct = pieceUnitCostFromProduct;
const client_1 = require("@prisma/client");
function unitsPerCartonValue(unitsPerCarton) {
    return unitsPerCarton && unitsPerCarton > 1 ? unitsPerCarton : 1;
}
function effectiveCartonCost(product) {
    const average = new client_1.Prisma.Decimal(product.averageCost);
    return average.gt(0) ? average : new client_1.Prisma.Decimal(product.costPrice);
}
function pieceUnitCostFromCarton(cartonCost, unitsPerCarton) {
    const upc = unitsPerCartonValue(unitsPerCarton);
    return new client_1.Prisma.Decimal(cartonCost).div(upc);
}
function pieceUnitCostFromProduct(product) {
    return pieceUnitCostFromCarton(effectiveCartonCost(product), product.unitsPerCarton);
}
//# sourceMappingURL=product-cost.util.js.map