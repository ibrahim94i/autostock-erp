"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushDto = exports.PushOperationDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const event_types_enum_1 = require("../../events/event-types.enum");
class PushOperationDto {
    clientUuid;
    type;
    payload;
    localSeq;
    occurredAt;
}
exports.PushOperationDto = PushOperationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PushOperationDto.prototype, "clientUuid", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(event_types_enum_1.EventType),
    __metadata("design:type", String)
], PushOperationDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], PushOperationDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], PushOperationDto.prototype, "localSeq", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PushOperationDto.prototype, "occurredAt", void 0);
class PushDto {
    deviceId;
    operations;
}
exports.PushDto = PushDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PushDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PushOperationDto),
    __metadata("design:type", Array)
], PushDto.prototype, "operations", void 0);
//# sourceMappingURL=push.dto.js.map