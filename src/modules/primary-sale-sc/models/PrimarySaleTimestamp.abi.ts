import { AddressType, U32Type, U64Type } from '@elrondnetwork/erdjs';

export interface PrimarySaleTimeAbi {
  start_sale: U64Type;
  end_sale: U64Type;
  start_claim: U64Type;
  end_claim: U64Type;
}

export interface TicketInfoAbi {
  buyer: AddressType;
  ticket_number: U32Type;
  winner_nonce: U64Type;
}