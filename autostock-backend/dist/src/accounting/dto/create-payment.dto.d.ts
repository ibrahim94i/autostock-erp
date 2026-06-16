export declare class CreatePaymentDto {
    partyType: 'CUSTOMER' | 'SUPPLIER';
    partyId: string;
    amount: number;
    direction: 'IN' | 'OUT';
    method?: string;
}
