/** 


*/

define(
	[
		'orbit/NameSpace',
		'jquery',
		'orbit/CelestialBody',
		'orbit/algorithm/GravityTicker',
		'orbit/graphics3d/Scene',
		'orbit/gui/Gui',
		'orbit/scenario/ScenarioLoader',
		'_'
	], 
	function(ns, $, CelestialBody, GravityTicker, Scene, Gui, ScenarioLoader) {

		var Universe = {
			init : function(){

				ns.U = this;
				this.playing = false;
				this.epochTime = 0;
				this.currentTime = ns.startEpochTime;

				Gui.init();
				Gui.addBtn('start/stop', 'start', function(){
					this.playing = !this.playing;
					this.tick();
				}.bind(this));

				//var scenario = ScenarioLoader.get('EarthMoon');
				//var scenario = ScenarioLoader.get('SolarSystem');
				var scenario = ScenarioLoader.get('SaturnMoon');
				//var scenario = ScenarioLoader.get('CentralSolarSystem');
				//var scenario = ScenarioLoader.get('Artificial');
				this.createBodies(scenario);

				this.scene = Object.create(Scene);
				this.calculateDimensions();
				this.scene.setCentralBody(this.centralBody);
				this.scene.createStage(scenario);

				this.initBodies(scenario);
				
				GravityTicker.setSecondsPerTick(scenario.secondsPerTick);
				GravityTicker.setCalculationsPerTick(scenario.calculationsPerTick || ns.defaultCalculationsPerTick);
				this.tick();

			},

			createBodies : function(scenario) {
				var bodies = [];
				this.bodies = {};
				
				$.each(scenario.bodies, function(name, config){
					var current = Object.create(CelestialBody);
					$.extend(current, config);
					current.name = name;
					this.centralBody = this.centralBody && this.centralBody.mass > current.mass ? this.centralBody : current;
					this.bodies[current.name] = current;
					bodies.push(current);
				}.bind(this));

				this.centralBody.isCentral = true;

			},

			initBodies : function(scenario){

				$.each(this.bodies, function(name, current){
					if((typeof scenario.calculateAll === 'undefined' || !scenario.calculateAll) && !current.isCentral){
						current.mass = 1;
					}
					current.init();
					current.calculateTraceParams(this.size, scenario.secondsPerTick);
					
				}.bind(this));

				//after all is inialized
				$.each(this.bodies, function(name, current){
					this.scene.addBody(current);
					current.afterInitialized();
					//console.log(current.name, current.isCentral);
				}.bind(this));
				
				GravityTicker.setBodies(this.bodies);
			},

			getBody : function(name) {
				if(name === 'central' || typeof name === 'undefined') {
					return this.centralBody;
				}
				return this.bodies[name];
			},

			calculateDimensions : function(){

				//find the largest radius in km among all bodies
				var largestRadius = _.reduce(this.bodies, function(memo, body){
					return memo < body.radius ? body.radius : memo;
				}, 0);
				//find the largest semi major axis in km among all bodies
				var largestSMA = _.reduce(this.bodies, function(memo, body){ 
					return (!body.isCentral && body.orbit && body.orbit.base.a > memo) ? body.orbit.base.a : memo;
				}, 0);
				console.log('universe size', largestSMA*ns.KM, ' m');
				this.size = largestSMA*ns.KM;
				this.scene.setDimension(this.size, largestRadius);

			},

			tick : function() {
				
				if(this.playing) {
					var deltaT = GravityTicker.tick();
					this.epochTime += deltaT;
					this.currentTime = ns.startEpochTime + this.epochTime;
					this.scene.updateCamera();
					this.scene.draw();
				} else {

					this.scene.updateCamera();
				}
				
				requestAnimFrame(this.tick.bind(this));
			},

			isPlaying : function() {
				return this.playing;
			}
		};
		
		return Universe;
		
	}
);


/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
 
// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
          };
})();