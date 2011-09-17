util = require('util');
fs = require('fs');
TickStorage = require('../lib/TickStorage');

exports['basic read']= function(test) {
	test.expect(4);
	
	var tickStorage = new TickStorage(__dirname+ '/data/ticks-correct', 'LVS', '20110104');
	test.ok(tickStorage.load());
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		totalVolume+=tick.volume;
		totalPrice+=tick.price;
		totalCount++;
	}
	
	test.equal(totalVolume, 39222254, 'total volume');
	test.equal(totalPrice, 55302035684, 'total price');
	test.equal(totalCount, 118003, 'total count');
	test.done();
}

exports['basic create'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	tickStorage.additionalData.adolf="hitler";
	
	tickStorage.addTick(unixtime-10, 100, 1000000, false);
	tickStorage.addTick(unixtime-9,  100, 1000000, true);
	tickStorage.addTick(unixtime-8,  100, 1010000, true);
	tickStorage.addTick(unixtime-7,  100, 1020000, true);
	tickStorage.addTick(unixtime-6,  500, 990000, true);
	
	test.ok(tickStorage.save());
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	test.ok(tickStorage.load());
	
	test.equal(tickStorage.additionalData.adolf, "hitler");
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		if (tick.isMarket) {
			totalVolume+=tick.volume;
			totalPrice+=tick.price;
			totalCount++;
		}
	}
	
	test.equal(totalVolume, 800, 'total volume');
	test.equal(totalPrice, 4020000, 'total price');
	test.equal(totalCount, 4, 'total count');
	
	test.deepEqual(tickStorage.getHloc(), {
		h: 1020000,
		l: 990000,
		o: 1000000,
		c: 990000
	})
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
}

exports['create huge'] = function(test) {
	test.expect(4);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	var i=0;
	for(i=0;i<10000;i++) {
		tickStorage.addTick(unixtime-10, 100, parseInt(Math.random()*100), true);
	}
	
	test.ok(tickStorage.save());
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	test.ok(tickStorage.load());
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		if (tick.isMarket) {
			totalVolume+=tick.volume;
			totalPrice+=tick.price;
			totalCount++;
		}
	}
	
	test.equal(totalVolume, 100*10000, 'total volume');
	test.equal(totalCount, 10000, 'total count');
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
}

exports['rewind'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime-10, 100, 1, false);
	tickStorage.addTick(unixtime-9,  100, 2, true);
	tickStorage.addTick(unixtime-8,  100, 3, true);
	tickStorage.addTick(unixtime-7,  100, 4, true);
	tickStorage.addTick(unixtime-6,  500, 5, true);
	
	tickStorage.save();
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.load();
	
	var tick;
	tick = tickStorage.nextTick();
	test.equal(tick.price, 1);
	
	tick = tickStorage.nextTick();
	test.equal(tick.price, 2);

	tick = tickStorage.nextTick();
	test.equal(tick.price, 3);
	
	tickStorage.rewind(1);
	tick = tickStorage.nextTick();
	test.equal(tick.price, 3);

	tickStorage.rewind(2);
	tick = tickStorage.nextTick();
	test.equal(tick.price, 2);

	tick = tickStorage.nextTick(); // 3
	tick = tickStorage.nextTick(); // 4
	tick = tickStorage.nextTick(); // 5

	tickStorage.rewind();
	tick = tickStorage.nextTick();
	test.equal(tick.price, 1);

	tick = tickStorage.nextTick(); // 2
	tick = tickStorage.nextTick(); // 3
	tick = tickStorage.nextTick(); // 4
	tick = tickStorage.nextTick(); // 5

	tickStorage.rewind(100);
	tick = tickStorage.nextTick();
	test.equal(tick.price, 1);

	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');

	test.done();
}


exports['create zero tick'] = function(test) {
	test.expect(2);
	
	var day = new Date();
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.save();
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.load();
	
	test.ok(!tickStorage.nextTick());
	
	test.deepEqual(tickStorage.getHloc(), {
		h: null,
		l: null,
		o: null,
		c: null
	})
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
}

exports['non-existing'] = function(test) {
	test.expect(2);
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', '20110101');
	test.ok(!tickStorage.load());
	
	tickStorage = new TickStorage('/tmp/nothinghereyet', 'DDDD', '20110101');
	tickStorage.prepareForNew();
	test.ok(!tickStorage.save());
	
	test.done();
}

exports['market data'] = function(test) {
	test.expect(12);

	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round

	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();

	tickStorage.addTick(unixtime-10, 100, 1, false);
	tickStorage.addTick(unixtime-9,  100, 2, true);
	tickStorage.addTick(unixtime-8,  100, 3, true);
	tickStorage.addTick(unixtime-7,  100, 4, true);
	tickStorage.addTick(unixtime-6,  500, 5, true);
	tickStorage.addTick(unixtime-5,  500, 6, false);
	
	var hloc = tickStorage.getHloc();

	test.equal(hloc.h, 5);
	test.equal(hloc.l, 2);
	test.equal(hloc.o, 2);
	test.equal(hloc.c, 5);
	test.equal(tickStorage.marketOpenPos,  1);
	test.equal(tickStorage.marketClosePos, 4);

	tickStorage.save();

	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.load();

	hloc = tickStorage.getHloc();

	test.equal(hloc.h, 5);
	test.equal(hloc.l, 2);
	test.equal(hloc.o, 2);
	test.equal(hloc.c, 5);
	test.equal(tickStorage.marketOpenPos,  1);
	test.equal(tickStorage.marketClosePos, 4);

	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};


exports['invalid data'] = function(test) {
	test.expect(5);

	var tickStorage; 
	
	// too new version
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100614');
	test.ok(!tickStorage.load());

	// invalid compressed data
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100615');
	test.ok(!tickStorage.load());

	// invalid minute index data
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100616');
	test.ok(!tickStorage.load());

	// invalid JSON header but larger than headersize
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100617');
	test.ok(!tickStorage.load());

	// invalid JSON header smaller than headersize
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100618');
	test.ok(!tickStorage.load());

	test.done();
};
