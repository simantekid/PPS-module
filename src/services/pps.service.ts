import { ppsClient } from '../lib/httpClient';
import { signDirectTopUp, signGamelist, signInquiryPln, signSell, signStatusTrx } from '../lib/signature';
import { config, ppsPaths } from '../config/env';
import {
  DirectTopUpResponse,
  GamelistApiResponse,
  GamelistItem,
  InquiryPlnResponse,
  SellResponse,
  StatusTrxResponse,
  TopUpField,
} from '../types/pps';

function nowTimestamp(): string {
  // Format wajib PPS: "YYYY-MM-DD HH:mm:ss"
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getGamelist(): Promise<GamelistItem[]> {
  const timestamp = nowTimestamp();
  const payload = {
    user: config.pps.user,
    timestamp,
    signature: signGamelist(timestamp),
  };

  console.log('[getGamelist] request ->', ppsPaths.gamelist, payload);

  const { data } = await ppsClient.post<GamelistApiResponse>(ppsPaths.gamelist, payload);


  // Kalau kredensial/signature salah, PPS balikin shape beda (gak ada `data.data`,
  // misal { status:"1", message:"User Not Found" }) - jangan crash, anggep list kosong
  // biar kegagalannya kebaca jelas belakangan (product not found) bukan TypeError.
  return data.data ?? [];
}

export async function directTopUp(params: {
  notrx: string;
  product: string;
  field: TopUpField;
}): Promise<DirectTopUpResponse> {
  const payload = {
    user: config.pps.user,
    product: params.product,
    notrx: params.notrx,
    field: params.field,
    signature: signDirectTopUp(params.product, params.notrx),
  };

  console.log(
    '[DIRECT TOP UP][MODULE -> PPS] REQUEST',
    JSON.stringify(
      {
        method: 'POST',
        url: `${config.pps.baseUrl}${ppsPaths.directTopUp}`,
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      },
      null,
      2,
    ),
  );

  const response = await ppsClient.post<DirectTopUpResponse>(ppsPaths.directTopUp, payload);

  console.log(
    '[DIRECT TOP UP][PPS -> MODULE] RESPONSE',
    JSON.stringify(
      {
        httpStatus: response.status,
        headers: response.headers,
        body: response.data,
      },
      null,
      2,
    ),
  );

  return response.data;
}

export async function sell(params: { notrx: string; produk: string; mdn: string }): Promise<SellResponse> {
  const body = new URLSearchParams({
    user: config.pps.user,
    produk: params.produk,
    mdn: params.mdn,
    notrx: params.notrx,
    signature: signSell(params.mdn, params.produk, params.notrx),
  });

  console.log(
    '[SELL][MODULE -> PPS] REQUEST',
    JSON.stringify(
      {
        method: 'POST',
        url: `${config.pps.baseUrl}${ppsPaths.sell}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: Object.fromEntries(body),
      },
      null,
      2,
    ),
  );

  const response = await ppsClient.post<SellResponse>(ppsPaths.sell, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  console.log(
    '[SELL][PPS -> MODULE] RESPONSE',
    JSON.stringify(
      {
        httpStatus: response.status,
        headers: response.headers,
        body: response.data,
      },
      null,
      2,
    ),
  );

  return response.data;
}

export async function inquiryPln(customerNumber: string): Promise<InquiryPlnResponse> {
  const payload = {
    user: config.pps.user,
    customerNumber,
    signature: signInquiryPln(customerNumber),
  };

  console.log('[inquiryPln] request ->', ppsPaths.inquiryPln, payload);

  const { data } = await ppsClient.post<InquiryPlnResponse>(ppsPaths.inquiryPln, payload);

  console.log('[inquiryPln] response ->', JSON.stringify(data, null, 2));

  return data;
}

export async function getStatusTrx(notrx: string): Promise<StatusTrxResponse> {
  const body = new URLSearchParams({
    user: config.pps.user,
    notrx,
    signature: signStatusTrx(notrx),
  });

  console.log('[getStatusTrx] request ->', ppsPaths.statusTrx, Object.fromEntries(body));

  const { data } = await ppsClient.post<StatusTrxResponse>(ppsPaths.statusTrx, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  console.log('[getStatusTrx] response ->', JSON.stringify(data, null, 2));

  return data;
}
