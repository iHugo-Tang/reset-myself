import { NextRequest } from 'next/server';

type Handler = (req: NextRequest, ctx?: { params?: Promise<Record<string, string>> }) => Promise<Response>;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

class RequestBuilder {
	private headers = new Headers();
	private payload: unknown;

	constructor(
		private readonly handler: Handler,
		private readonly method: Method,
		private readonly url: string,
		private readonly params?: Record<string, string>,
	) {}

	set(name: string, value: string) {
		this.headers.set(name.toLowerCase(), value);
		return this;
	}

	type(value: string) {
		if (value === 'form') {
			this.headers.set('content-type', 'application/x-www-form-urlencoded');
		} else {
			this.headers.set('content-type', value);
		}
		return this;
	}

	send(body: unknown) {
		this.payload = body;
		return this;
	}

	private buildBody(): BodyInit | undefined {
		if (this.payload === undefined) return undefined;
		const contentType = this.headers.get('content-type');
		if (contentType?.includes('application/json')) {
			return JSON.stringify(this.payload);
		}
		if (contentType?.includes('application/x-www-form-urlencoded')) {
			const params = new URLSearchParams();
			Object.entries(this.payload as Record<string, string | number | boolean>).forEach(([key, value]) => {
				params.append(key, String(value));
			});
			return params.toString();
		}
		if (typeof this.payload === 'string' || this.payload instanceof Buffer) {
			return this.payload;
		}
		return JSON.stringify(this.payload);
	}

	private async execute() {
		// Default to JSON when a payload is provided without explicit content-type
		if (this.payload !== undefined && !this.headers.has('content-type')) {
			this.headers.set('content-type', 'application/json');
		}

		const init: RequestInit = {
			method: this.method,
			headers: Object.fromEntries(this.headers.entries()),
			body: this.buildBody(),
		};
		const request = new NextRequest(`http://localhost${this.url}`, init);
		const response = await this.handler(request, { params: Promise.resolve(this.params ?? {}) });
		const buffer = Buffer.from(await response.arrayBuffer());
		const text = buffer.toString('utf8');
		const headers = Object.fromEntries(response.headers.entries());
		const contentType = headers['content-type'] ?? '';
		const parsedBody = contentType.includes('application/json') && text ? JSON.parse(text) : undefined;

		return {
			status: response.status,
			body: parsedBody,
			text,
			headers,
			ok: response.ok,
		};
	}

	async expect(status: number) {
		const res = await this.execute();
		if (res.status !== status) {
			throw new Error(`Expected status ${status} but received ${res.status}`);
		}
		return res;
	}

	/**
	 * Allow direct await without calling expect
	 */
	then<TResult1 = unknown, TResult2 = never>(
		onfulfilled?: ((value: Awaited<ReturnType<RequestBuilder['execute']>>) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	) {
		return this.execute().then(onfulfilled, onrejected);
	}
}

export const createRouteTester = (handler: Handler, params?: Record<string, string>) => {
	return {
		request: {
			get: (url: string) => new RequestBuilder(handler, 'GET', url, params),
			post: (url: string) => new RequestBuilder(handler, 'POST', url, params),
			patch: (url: string) => new RequestBuilder(handler, 'PATCH', url, params),
			delete: (url: string) => new RequestBuilder(handler, 'DELETE', url, params),
		},
		close: async () => {},
	};
};
