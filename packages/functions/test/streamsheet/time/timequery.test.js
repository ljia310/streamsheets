const { sleep } = require('@cedalo/commons');
const { FunctionErrors } = require('@cedalo/error-codes');
const { createCellAt } = require('../../utilities');
const { newMachine, newSheet } = require('./utils');

const ERROR = FunctionErrors.code;

describe('timequery', () => {
	describe.skip('parameter mapping', () => {
		it(`should return ${ERROR.ARGS} if two few arguments are given`, () => {
			const sheet = newSheet();
			createCellAt('A3', { formula: 'time.query()' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.ARGS);
			createCellAt('A3', { formula: 'time.query(,)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		});
		it(`should return ${ERROR.VALUE} if query is not a json`, () => {
			const sheet = newSheet();
			createCellAt('A1', { formula: 'time.store(JSON(B1:C1))' }, sheet);
			createCellAt('A3', { formula: 'time.query(A1,)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1, true)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,"v1:1")' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,42)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		});
		it('should accept multiple queries', async () => {
			const machine = newMachine();
			const sheet = machine.getStreamSheetByName('T1').sheet;
			sheet.load({
				cells: {
					A1: { formula: 'time.store(JSON(B1:C1))' },
					A2: 'field', B2: 'v1'
				}
			});
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2))' }, sheet);
			await machine.step();
			let cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.queries.length).toBe(1);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),JSON(A2:B2))' }, sheet);
			await machine.step();
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.queries.length).toBe(2);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),JSON(A2:B2),JSON(A2:B2))' }, sheet);
			await machine.step();
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.queries.length).toBe(3);
		});
		it('should identify interval parameter', () => {
			const sheet = newSheet();
			sheet.load({
				cells: {
					A1: { formula: 'time.store(JSON(B1:C1))' },
					A2: 'field', B2: 'v1'
				}
			});
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2))' }, sheet);
			let cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			// default value signals no interval set
			expect(cell.term.interval).toBe(-1);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			// default value signals no interval set
			expect(cell.term.interval).toBe(-1);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),60)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.interval).toBe(60);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),JSON(A2:B2),JSON(A2:B2),1)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.interval).toBe(1);
		});
		it(`should return ${ERROR.VALUE} for invalid interval parameter`, () => {
			const sheet = newSheet();
			sheet.load({
				cells: {
					A1: { formula: 'time.store(JSON(B1:C1))' },
					A2: 'field', B2: 'v1'
				}
			});
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),true)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),"")' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),"42")' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),0)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),-12)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		});
		it('should identify range parameter', () => {
			const sheet = newSheet();
			sheet.load({
				cells: {
					A1: { formula: 'time.store(JSON(B1:C1))' },
					A2: 'field', B2: 'v1'
				}
			});
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),1,A5:C6)' }, sheet);
			let cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.range.toString()).toBe('A5:C6');
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,A5:C6)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.range.toString()).toBe('A5:C6');
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),JSON(A2:B2),JSON(A2:B2),,A5:C6)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.range.toString()).toBe('A5:C6');
		});
		it(`should return ${ERROR.VALUE} for invalid range parameter`, () => {
			const sheet = newSheet();
			sheet.load({
				cells: {
					A1: { formula: 'time.store(JSON(B1:C1))' },
					A2: 'field', B2: 'v1'
				}
			});
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),1,true)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,"r1:s2")' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),JSON(A2:B2),JSON(A2:B2),,42)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),JSON(A2:B2),JSON(A2:B2),,)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(true);
		});
		it('should identify limit parameter', () => {
			const sheet = newSheet();
			sheet.load({
				cells: {
					A1: { formula: 'time.store(JSON(B1:C1))' },
					A2: 'field', B2: 'v1'
				}
			});
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2))' }, sheet);
			let cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			// default value
			expect(cell.term.limit).toBe(500);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,,)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			// default value
			expect(cell.term.limit).toBe(500);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,,60)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.limit).toBe(60);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),JSON(A2:B2),JSON(A2:B2),1,,1)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.limit).toBe(1);
			// MIN_LIMIT is 1
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),1,,0)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.limit).toBe(1);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,,-1)' }, sheet);
			cell = sheet.cellAt('A3');
			expect(cell.value).toBe(true);
			expect(cell.term.limit).toBe(1);
		});
		it(`should return ${ERROR.VALUE} for invalid limit parameter`, () => {
			const sheet = newSheet();
			sheet.load({
				cells: {
					A1: { formula: 'time.store(JSON(B1:C1))' },
					A2: 'field', B2: 'v1'
				}
			});
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,,true)' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,,"")' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
			createCellAt('A3', { formula: 'time.query(A1,JSON(A2:B2),,,"42")' }, sheet);
			expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		});
		it(`should return an ${ERROR.VALUE} if first parameter does not reference time.store`, () => {
			const sheet = newSheet();
			createCellAt('A1', 'v1', sheet);
			createCellAt('A4', { formula: 'time.query(A1, "v1")' }, sheet);
			const cell = sheet.cellAt('A4');
			// const term = cell.term;
			expect(cell.value).toBe(ERROR.VALUE);
		});


		// it(`should return ${ERROR.VALUE} if passed interval, target range or limt are invalid`, () => {
		// 	const sheet = newSheet();
		// 	createCellAt('A1', { formula: 'time.store(JSON(B1:C1))' }, sheet);
		// 	createCellAt('A3', { formula: 'time.query(A1, true)' }, sheet);
		// 	expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		// 	createCellAt('A3', { formula: 'time.query(A1,)' }, sheet);
		// 	expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		// 	createCellAt('A3', { formula: 'time.query(A1,"v1:1")' }, sheet);
		// 	expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		// 	createCellAt('A3', { formula: 'time.query(A1,42)' }, sheet);
		// 	expect(sheet.cellAt('A3').value).toBe(ERROR.VALUE);
		// });
		// it('should identify limit parameter', () => {

		// });
		// it('should identify target range parameter', () => {

		// });
	});

	describe('query',() => {
		it.skip('should return all values stored if no interval and no aggregate method are specified', async () => {
			const machine = newMachine();
			const sheet = machine.getStreamSheetByName('T1').sheet;
			sheet.load({
				cells: {
					A1: 'v1', B1: { formula: 'B1+1)' },
					A2: 'v2', B2: { formula: 'B2+10)' },
					A3: { formula: 'time.store(JSON(A1:B2))' },
					A4: 'field', B4: 'v1',
					A5: 'field', B5: 'v2',
					A6: { formula: 'time.query(A3, JSON(A4:B5))' }
				}
			});
			const querycell = sheet.cellAt('A6');
			expect(querycell.value).toBe(true);
			await machine.step();
			await machine.step();
			await machine.step();
			expect(querycell.info.values).toBeDefined();
			expect(querycell.info.values.v1).toBeDefined();
			expect(querycell.info.values.v2).toBeDefined();
			expect(querycell.info.values.v1.length).toBe(3);
			expect(querycell.info.values.v2.length).toBe(3);
			expect(querycell.info.values.v1[0]).toBe(2);
			expect(querycell.info.values.v1[1]).toBe(3);
			expect(querycell.info.values.v1[2]).toBe(4);
			expect(querycell.info.values.v2[0]).toBe(20);
			expect(querycell.info.values.v2[1]).toBe(30);
			expect(querycell.info.values.v2[2]).toBe(40);
			await machine.step();
			expect(querycell.info.values.v1.length).toBe(4);
			expect(querycell.info.values.v2.length).toBe(4);
			expect(querycell.info.values.v1[3]).toBe(5);
			expect(querycell.info.values.v2[3]).toBe(50);
		});
		it('should aggregate values in given interval', async () => {
			const machine = newMachine({ cycletime: 10 });
			const sheet = machine.getStreamSheetByName('T1').sheet;
			sheet.load({
				cells: {
					A1: 'v1', B1: { formula: 'B1+1)' },
					A2: 'v2', B2: { formula: 'B2+10)' },
					A3: { formula: 'time.store(JSON(A1:B2))' },
					A4: 'field', B4: 'v1', C4: 'field', D4: 'v2',
					A5: 'aggregate', B5: 9, C5: 'aggregate', D5: 4,					
					A8: { formula: 'time.query(A3, JSON(A4:B5), 30/1000)' }
				}
			});
			const querycell = sheet.cellAt('A8');
			expect(querycell.value).toBe(true);
			await machine.start();
			// await machine.step();
			// await machine.step();
			await sleep(40); // , () => machine.stop());
			await machine.stop();
			// await machine.stop();
			// await machine.step();
			expect(querycell.info.values).toBeDefined();
			
			// expect(querycell.info.values.v1).toBeDefined();
			// expect(querycell.info.values.v1.length).toBe(4);
			// expect(querycell.info.values.v1[0]).toBe(2);

			// expect(querycell.info.values.v1[1]).toBe(3);
			// expect(querycell.info.values.v1[2]).toBe(4);
			// expect(querycell.info.values.v2).toBeDefined();
			// expect(querycell.info.values.v2.length).toBe(3);
			// expect(querycell.info.values.v2[0]).toBe(20);
			// expect(querycell.info.values.v2[1]).toBe(30);
			// expect(querycell.info.values.v2[2]).toBe(40);
			// await machine.step();
			// expect(querycell.info.values.v1.length).toBe(4);
			// expect(querycell.info.values.v2.length).toBe(4);
			// expect(querycell.info.values.v1[3]).toBe(5);
			// expect(querycell.info.values.v2[3]).toBe(50);
		});
		it.skip('should only aggregate values which timestamp is in given interval', () => {

		});
	});
	// it('should be possible to aggregate values', () => {
	// 	parameter list of query jsons!
	// 	json = {
	// 		value: v1
	// 		aggregate: a predefined time aggregate methods
	// 		min: optional
	// 		max: optional
	// 	}
	// 	parameter: ? interval - optional
	// 	parameter: ? limit - optional
	// 	parameter: ? targetrange - optional
	// 	expect(false).toBe(true);
	// });
	// it('should be possible to aggregate values in intervals', () => {
	// 	expect(false).toBe(true);
	// });
	// it('should support ranges for values', () => {
	// 	expect(false).toBe(true);
	// });
	// it('should be possible to limit values', () => {
	// 	expect(false).toBe(true);
	// });
	describe.skip('time.interval', () => {
		it('should support only defined aggregate methods', async () => {
			const machine = newMachine({ cycletime: 1000 });
			const sheet = machine.getStreamSheetByName('T1').sheet;
			createCellAt('A1', { formula: 'time.store(JSON(B1:C1))' }, sheet);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 0)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 1)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 2)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 3)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 4)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 5)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 6)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 7)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 9)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(true);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 8)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(ERROR.VALUE);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", 10)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(ERROR.VALUE);
			createCellAt('A2', { formula: 'time.interval(A1, "v1", -1)' }, sheet);
			expect(sheet.cellAt('A2').value).toBe(ERROR.VALUE);
		});
		it('should write values to cell info if no target specified', async () => {
			const machine = newMachine({ cycletime: 1000 });
			const sheet = machine.getStreamSheetByName('T1').sheet;
			createCellAt('A1', 'v1', sheet);
			createCellAt('B1', { formula: 'B1+1)' }, sheet);
			createCellAt('A2', { formula: 'time.store(JSON(A1:B1))' }, sheet);
			createCellAt('A3', { formula: 'time.interval(A2, "v1", 9, 5/1000)' }, sheet);
			const intervalcell = sheet.cellAt('A3');
			expect(intervalcell.value).toBe(true);
			// await sleep(10);
			await machine.step();
			expect(intervalcell.value).toBe(2);
			expect(intervalcell.info.values.length).toBe(0);
			await sleep(10);
			await machine.step();
			expect(intervalcell.value).toBe(5);
			expect(intervalcell.info.values.length).toBe(1);
			expect(intervalcell.info.values[0].value).toBe(3);
			await sleep(10);
			await machine.step();
			expect(intervalcell.value).toBe(9);
			expect(intervalcell.info.values.length).toBe(2);
			expect(intervalcell.info.values[1].value).toBe(4);
		});
		it('should write all time-store values to cell info if no interval is specified', async () => {
			const machine = newMachine({ cycletime: 1000 });
			const sheet = machine.getStreamSheetByName('T1').sheet;
			createCellAt('A1', 'v1', sheet);
			createCellAt('B1', { formula: 'B1+1)' }, sheet);
			createCellAt('A2', { formula: 'time.store(JSON(A1:B1))' }, sheet);
			createCellAt('A3', { formula: 'time.interval(A2, "v1", 9)' }, sheet);
			const intervalcell = sheet.cellAt('A3');
			expect(intervalcell.value).toBe(true);
			await machine.step();
			await machine.step();
			await machine.step();
			expect(intervalcell.info.values.length).toBe(3);
			expect(intervalcell.info.values[0].value).toBe(2);
			expect(intervalcell.info.values[1].value).toBe(3);
			expect(intervalcell.info.values[2].value).toBe(4);
			await machine.step();
			expect(intervalcell.info.values.length).toBe(4);
			expect(intervalcell.info.values[3].value).toBe(5);
		});
		it('should store maximum period/time or limit values', async () => {
			const machine = newMachine({ cycletime: 1000 });
			const sheet = machine.getStreamSheetByName('T1').sheet;
			createCellAt('A1', 'v1', sheet);
			createCellAt('B1', { formula: 'B1+1)' }, sheet);
			createCellAt('A2', { formula: 'time.store(JSON(A1:B1))' }, sheet);
			createCellAt('A3', { formula: 'time.interval(A2, "v1", 9, , , 2)' }, sheet);
			let intervalcell = sheet.cellAt('A3');
			expect(intervalcell.value).toBe(true);
			await machine.step();
			await machine.step();
			await machine.step();
			expect(intervalcell.value).toBe(9);
			expect(intervalcell.info.values.length).toBe(2);
			expect(intervalcell.info.values[0].value).toBe(3);
			expect(intervalcell.info.values[1].value).toBe(4);
			// now check with specified interval => TODO: should we limit by period/size? => different behaviour?
			createCellAt('A3', { formula: 'time.interval(A2, "v1", 9, 2/1000, , 2)' }, sheet);
			intervalcell = sheet.cellAt('A3');
			expect(intervalcell.value).toBe(true);
			await machine.step();
			await sleep(4);
			await machine.step();
			await sleep(4);
			await machine.step();
			await sleep(4);
			await machine.step();
			expect(intervalcell.info.values.length).toBe(2);
			expect(intervalcell.info.values[0].value).toBe(7);
			expect(intervalcell.info.values[1].value).toBe(8);
		});
		it('should write values to target range and cell info', async () => {
			const machine = newMachine({ cycletime: 1000 });
			const sheet = machine.getStreamSheetByName('T1').sheet;
			createCellAt('A1', 'v1', sheet);
			createCellAt('A2', 'v2', sheet);
			createCellAt('A3', 'v3', sheet);
			createCellAt('B1', { formula: 'B1+1)' }, sheet);
			createCellAt('B2', { formula: 'B2+2' }, sheet);
			createCellAt('B3', { formula: 'B3+3' }, sheet);
			createCellAt('A5', { formula: 'time.store(JSON(A1:B3))' }, sheet);
			createCellAt('A6', { formula: 'time.interval(A5, "v2", 9, 2/1000, D5:E10)' }, sheet);
			const now = Date.now();
			const intervalcell = sheet.cellAt('A6');
			expect(intervalcell.value).toBe(true);
			await machine.step();
			await sleep(4);
			await machine.step();
			await sleep(4);
			await machine.step();
			await sleep(4);
			await machine.step();
			expect(intervalcell.value).toBe(28);
			expect(intervalcell.info.values.length).toBe(3);
			expect(intervalcell.info.values[0].value).toBe(6);
			expect(intervalcell.info.values[1].value).toBe(8);
			expect(intervalcell.info.values[2].value).toBe(10);
			expect(sheet.cellAt('D5').value).toBeGreaterThan(now);
			expect(sheet.cellAt('E5').value).toBe(6);
			expect(sheet.cellAt('D6').value).toBeGreaterThan(now + 0.002);
			expect(sheet.cellAt('E6').value).toBe(8);
			expect(sheet.cellAt('D7').value).toBeGreaterThan(now + 0.004);
			expect(sheet.cellAt('E7').value).toBe(10);
			expect(sheet.cellAt('D8')).toBeUndefined();
			expect(sheet.cellAt('E8')).toBeUndefined();
		});
		it('should ignore undefined values', async () => {
			const machine = newMachine({ cycletime: 1000 });
			const sheet = machine.getStreamSheetByName('T1').sheet;
			createCellAt('A1', 'v1', sheet);
			createCellAt('B1', { formula: 'B1+1)' }, sheet);
			createCellAt('A2', { formula: 'time.store(JSON(A1:B1))' }, sheet);
			createCellAt('A3', { formula: 'time.interval(A2, "v1", 9, 2/1000)' }, sheet);
			const intervalcell = sheet.cellAt('A3');
			expect(intervalcell.value).toBe(true);
			await machine.step();
			await sleep(4);
			await machine.step(); // 3
			createCellAt('B1', undefined, sheet);
			await sleep(4);
			await machine.step();
			createCellAt('B1', { formula: 'B1+1)' }, sheet);
			await sleep(4);
			await machine.step();
			expect(intervalcell.info.values.length).toBe(3);
			expect(intervalcell.info.values[0].value).toBe(3);
			expect(intervalcell.info.values[1].value).toBe(0);
			expect(intervalcell.info.values[2].value).toBe(2);
		});
		// TODO: should we really return this? we always want aggregated store value!!! Don't we?
		it.skip(`should return ${ERROR.LIMIT} if limit was reached`, () => {
			// set low limit, step until enough is stored => function should return error
		});
		// TODO: should we really return this? NA is returned already by time.store, isn't it?
		it.skip(`should return ${ERROR.NA} until first value is available`, async () => {
			// do not store something for several steps => we expect NA return
			// store something => step => expect value
		});
	});
	
});
