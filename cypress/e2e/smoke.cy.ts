describe('Timeline smoke test', () => {
	it('renders timeline with stubbed data', () => {
		cy.fixture('timeline.json').then((timeline) => {
			cy.intercept('GET', '/api/timeline*', {
				statusCode: 200,
				body: { success: true, data: timeline },
			});
		});

		cy.visit('/timeline');
		cy.contains('RESET MYSELF');
		cy.contains('Daily summary');
		cy.contains('Run');
	});
});
