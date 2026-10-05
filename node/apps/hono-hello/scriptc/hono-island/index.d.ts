export interface HonoResult {
  status: number;
  contentType: string;
  body: string;
}

export function handle(method: string, url: string): Promise<HonoResult>;
