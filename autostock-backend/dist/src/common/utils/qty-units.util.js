"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitsPerCartonValue = unitsPerCartonValue;
exports.toPieceQty = toPieceQty;
exports.normalizeSaleItemUnits = normalizeSaleItemUnits;
function unitsPerCartonValue(unitsPerCarton) {
    return unitsPerCarton && unitsPerCarton > 1 ? unitsPerCarton : 1;
}
function toPieceQty(displayQty, qtyUnit, unitsPerCarton) {
    if (qtyUnit === 'carton') {
        return displayQty * unitsPerCartonValue(unitsPerCarton);
    }
    return displayQty;
}
function normalizeSaleItemUnits(qty, qtyUnit, displayQty, unitsPerCarton) {
    const unit = qtyUnit === 'carton' ? 'carton' : 'piece';
    const upc = unitsPerCartonValue(unitsPerCarton);
    if (displayQty !== undefined && displayQty > 0) {
        return { qtyUnit: unit, displayQty };
    }
    if (unit === 'carton' && upc > 1) {
        return { qtyUnit: 'carton', displayQty: qty / upc };
    }
    return { qtyUnit: 'piece', displayQty: qty };
}
//# sourceMappingURL=qty-units.util.js.map