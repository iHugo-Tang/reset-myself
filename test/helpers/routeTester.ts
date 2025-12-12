import { createServer, type IncomingMessage } from 'node:http';
import { NextRequest } from 'next/server';
import supertest from 'supertest';

const readBody = async (req: IncomingMessage): Promise<Buffer> => {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
};

type Handler = (req: NextRequest, ctx?: { params?: Promise<Record<string, string>> }) => Promise<Response>;

export const createRouteTester = (handler: Handler, params?: Record<string, string>) => {
	const server = createServer(async (req, res) => {
		const body = await readBody(req);
		const headers = Object.fromEntries(
			Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value ?? '']),
		);
		const init: RequestInit = {
			method: req.method,
			headers: headers as Record<string, string>,
			body: body.length ? body : undefined,
		};

		const nextReq = new NextRequest(`http://localhost${req.url}`, init);
		const response = await handler(nextReq, { params: Promise.resolve(params ?? {}) });

		res.statusCode = response.status;
		response.headers.forEach((value, key) => res.setHeader(key, value));
		const buffer = Buffer.from(await response.arrayBuffer());
		res.end(buffer);
	});

	return {
		request: supertest(server),
		close: () =>
			new Promise<void>((resolve) => {
				server.close(() => resolve());
			}),
	};
};
