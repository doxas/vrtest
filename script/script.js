// ============================================================================
// # TODO
// * クォータニオンの正規化関連
// * ポジトラのチェック
// 
// 
// ============================================================================

var vr;                      // vr wrap
var qvr = gl3.qtn.create();  // vr quaternion
var qc = gl3.qtn.create();   // vr camera quaternion
var qt = gl3.qtn.create();   // mouse quaternion
gl3.qtn.identity(qt);
var run = true;
var info = null;

var PUSH_VR = true; // rendering target to hmd flags
var POSITION_SCALE = 1; // position tracking scale coefficient

window.onload = function(){
	vr = new HMD();
	vr.init(initialize);
};

// ============================================================================
function initialize(){
	var i, j;
	
	// initialize
	gl3.initGL('canvas');
	if(!gl3.ready){console.log('initialize error'); return;}
	var gl = gl3.gl;

	// canvas size
	gl3.canvas.width  = window.innerWidth;
	gl3.canvas.height = window.innerHeight;

	// event
	window.addEventListener('keydown', keyDown, false);
	document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
	document.addEventListener("mozfullscreenchange", onFullscreenChange, false);
	
	// dom
	info = {
		infoX: document.getElementById('infoX'),
		infoY: document.getElementById('infoY'),
		infoZ: document.getElementById('infoZ'),
		infoW: document.getElementById('infoW'),
		infoPX: document.getElementById('infoPX'),
		infoPY: document.getElementById('infoPY'),
		infoPZ: document.getElementById('infoPZ'),
		infoPW: document.getElementById('infoPW')
	};

	// program
	var prg = gl3.program.create(
		'vs',
		'fs',
		['position', 'normal', 'color'],
		[3, 3, 4],
		['mMatrix', 'mvpMatrix', 'invMatrix', 'lightPosition', 'eyePosition', 'centerPoint', 'ambientColor'],
		['matrix4fv', 'matrix4fv', 'matrix4fv', '3fv', '3fv', '3fv', '4fv']
	);

	// torus mesh
	var torusData = gl3.mesh.torus(32, 32, 1.0, 4.0);
	var torusVBO = [
		gl3.create_vbo(torusData.position),
		gl3.create_vbo(torusData.normal),
		gl3.create_vbo(torusData.color)
	];
	var torusIBO = gl3.create_ibo(torusData.index);

	// sphere mesh
	var sphereData = gl3.mesh.sphere(32, 32, 0.25);
	var sphereVBO = [
		gl3.create_vbo(sphereData.position),
		gl3.create_vbo(sphereData.normal),
		gl3.create_vbo(sphereData.color)
	];
	var sphereIBO = gl3.create_ibo(sphereData.index);

	// hall mesh
	hallData.color = [];
	for(i = 0, j = hallData.position.length; i < j; i += 3){
		hallData.color.push(1.0, 1.0, 1.0, 1.0);
	}
	var hallVBO = [
		gl3.create_vbo(hallData.position),
		gl3.create_vbo(hallData.normal),
		gl3.create_vbo(hallData.color)
	];
	var hallIBO = gl3.create_ibo(hallData.index);

	// matrix
	mMatrix = gl3.mat4.identity(gl3.mat4.create());
	vMatrix = gl3.mat4.identity(gl3.mat4.create());
	pMatrix = gl3.mat4.identity(gl3.mat4.create());
	vpMatrix = gl3.mat4.identity(gl3.mat4.create());
	mvpMatrix = gl3.mat4.identity(gl3.mat4.create());
	invMatrix = gl3.mat4.identity(gl3.mat4.create());
	qMatrix = gl3.mat4.identity(gl3.mat4.create());

	// depth test
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	gl.clearDepth(1.0);

	// rendering
	var count = 0;
	var lightPosition = [30.0, 30.0, 30.0];
	
	// sensor reset
	if(vr.ready){
		vr.resizeFov(0.0);
		vr.reset();
	}
	
	// rendering
	render();
	function render(){
		var gl = gl3.gl;
		
		// initial
		count++;
		gl3.canvas.width  = window.innerWidth;
		gl3.canvas.height = window.innerHeight;
		gl3.scene_clear([0.3, 0.3, 0.3, 1.0], 1.0);
		
		// camera
		var cameraPosition = [0.0, 0.0, 10.0];
		var centerPoint = [0.0, 0.0, -10.0];
		var cameraUpDirection = [0.0, 1.0, 0.0];
		
		// vr
		if(vr.ready){
			if(!vr.update()){
				console.log('hmd update failed!');
				return;
			}
			gl3.qtn.identity(qvr);
			gl3.qtn.rotate(
				(1.0 - vr.state.orientation.w) * gl3.PI,
				[
					vr.state.orientation.x,
					vr.state.orientation.y,
					vr.state.orientation.z
				],
				qvr
			);
			gl3.qtn.rotate(
				(1.0 - vr.state.orientation.w) * gl3.PI,
				[
					-vr.state.orientation.x,
					-vr.state.orientation.y,
					vr.state.orientation.z
				],
				qc
			);
			gl3.qtn.toMatIV(qvr, qMatrix);
			gl3.qtn.toVecIII([0.0, 0.0, -10.0], qc, centerPoint);
			
			// info
			info.infoX.textContent = 'orientation-x: ' + vr.state.orientation.x;
			info.infoY.textContent = 'orientation-y: ' + vr.state.orientation.y;
			info.infoZ.textContent = 'orientation-z: ' + vr.state.orientation.z;
			info.infoW.textContent = 'orientation-w: ' + vr.state.orientation.w;
			info.infoPX.textContent = 'position-x: ' + vr.state.position.x;
			info.infoPY.textContent = 'position-y: ' + vr.state.position.y;
			info.infoPZ.textContent = 'position-z: ' + vr.state.position.z;
			info.infoPW.textContent = 'position-w: ' + vr.state.position.w;
		}else{
			gl3.mat4.identity(qMatrix);
		}
		
		// render
		if(vr.vrMode){
			var etl = vr.eyeTranslation.left;
			var etr = vr.eyeTranslation.right;
			var evl = vr.eyeViewport.left;
			var evr = vr.eyeViewport.right;
			renderMode([etl.x, etl.y, etl.z], [evl.left, evl.right, evl.width, evl.height]);
			renderMode([etr.x, etr.y, etr.z], [evr.left, evr.right, evr.width, evr.height]);
		}else{
			renderMode(cameraPosition, [0, 0, gl3.canvas.width, gl3.canvas.height]);
		}
		
		// animation
		if(run){requestAnimationFrame(render);}
		
		// rendering mode function
		function renderMode(trans, view){
			var i, j;
			j = 1.0;
			cameraPosition[0] = trans[0] * j;
			cameraPosition[1] = trans[1] * j;
			cameraPosition[2] = trans[2] * j;
			var camera = gl3.camera.create(
				cameraPosition, centerPoint, cameraUpDirection,
				90, vr.aspect, 0.1, 100.0
			);
			gl3.scene_view(camera, view[0], view[1], view[2], view[3]);
			gl3.mat4.vpFromCamera(camera, vMatrix, pMatrix, vpMatrix);
			
			// torus rendering
			prg.set_program();
			prg.set_attribute(hallVBO, hallIBO);
			var ambientColor = [0.1, 0.1, 0.1, 0.0];
			gl3.mat4.identity(mMatrix);
			gl3.mat4.translate(mMatrix, [0.0, -1.0, 0.0], mMatrix);
			gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
			gl3.mat4.inverse(mMatrix, invMatrix);
			prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
			gl3.draw_elements(gl.TRIANGLES, hallData.index.length);
			
			// torus rendering
			prg.set_attribute(torusVBO, torusIBO);
			var radian = gl3.TRI.rad[count % 360];
			var axis = [0.0, 1.0, 1.0];
			for(i = 0; i < 90; i++){
				gl3.mat4.identity(mMatrix);
				gl3.mat4.rotate(mMatrix, radian, [0,0,1], mMatrix);
				gl3.mat4.translate(mMatrix, [30.0, 0.0, 0.0], mMatrix);
				gl3.mat4.rotate(mMatrix, gl3.TRI.rad[(count + i * 4) % 360], [0,1,0], mMatrix);
				gl3.mat4.translate(mMatrix, [-30.0, 0.0, 0.0], mMatrix);
				gl3.mat4.rotate(mMatrix, gl3.TRI.rad[i * 2], [0,0,1], mMatrix);
				gl3.mat4.rotate(mMatrix, gl3.PI2, [1,0,0], mMatrix);
//				gl3.mat4.multiply(mMatrix, qMatrix, mMatrix);
				gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
				gl3.mat4.inverse(mMatrix, invMatrix);
				prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
//				gl3.draw_elements(gl.TRIANGLES, torusData.index.length);
			}
		}
	}
}

function keyDown(eve){
	if(eve.keyCode === 13){
		if(vr.ready){
			vr.vrMode = true;
			vr.resize();
			var flg = {}
			if(PUSH_VR){flg.vrDisplay = vr.hmd;}
			if(gl3.canvas.webkitRequestFullscreen){
				gl3.canvas.webkitRequestFullscreen(flg);
			}else if(gl3.canvas.mozRequestFullScreen){
				gl3.canvas.mozRequestFullScreen(flg);
			}
		}
	}else if(eve.keyCode === 27){
		run = false;
	}
}

function onFullscreenChange() {
	if(!document.webkitFullscreenElement && !document.mozFullScreenElement){vr.vrMode = false;}
	vr.resize();
	vr.reset();
}

// hmd ========================================================================
function HMD(){
	this.ready    = false;
	this.vrMode   = false;
	this.sensor   = null;
	this.hmd      = null;
	this.state    = null;
	this.aspect   = 1.0;
	this.fovScale = 1.0;
	this.viewport = {width: 1920, height: 1080};
	this.fov            = {left: null, right: null};
	this.eyeTranslation = {left: null, right: null};
	this.eyeViewport    = {left: null, right: null};
	var tmp = this;
	this.init = function(callbackFunction){
		if(navigator.getVRDevices){
			navigator.getVRDevices().then(callback, callbackFunction);
		}else{
			console.log('device not found');
			callbackFunction();
		}
		function callback(device){
			for(var i = 0; i < device.length; i++){
				if(device[i] instanceof HMDVRDevice){
					tmp.hmd = device[i];
					tmp.eyeTranslation.left  = tmp.hmd.getEyeTranslation('left');
					tmp.eyeTranslation.right = tmp.hmd.getEyeTranslation('right');
					break;
				}
			}
			for(i = 0; i < device.length; i++){
				if(device[i] instanceof PositionSensorVRDevice &&
				  (!tmp.hmd || device[i].hardwareUnitId == tmp.hmd.hardwareUnitId)){
					tmp.sensor = device[i];
					if('resetSensor' in tmp.sensor){
						tmp.sensor.resetSensor();
					}else if('zeroSensor' in tmp.sensor){
						tmp.sensor.zeroSensor();
					}
					console.log(tmp.sensor.hardwareUnitId);
					console.log(tmp.sensor.deviceId);
					console.log(tmp.sensor.deviceName);
					break;
				}
			}
			tmp.ready = true;
			callbackFunction();
		}
	};
	this.update = function(){
		if(!this.sensor){return false;}
		this.state = this.sensor.getState();
		// this.state.timeStamp.toFixed(2);
		// this.state.orientation;
		// this.state.position;
		// this.state.angularVelocity;
		// this.state.linearVelocity;
		// this.state.angularAcceleration;
		// this.state.linearAcceleration;
		return true;
	};
	this.resize = function(){
		if(this.vrMode){
			this.aspect = this.viewport.width / this.viewport.height;
		}else{
			this.aspect = window.innerWidth / window.innerHeight;
		}
	};
	this.resizeFov = function(amount){
		var fovLeft, fovRight, a;
		if(!this.hmd){return;}
		if(amount == null){a = 0.0;}else{a = amount;}
		if(a != 0 && 'setFieldOfView' in this.hmd){
			this.fovScale += a;
			if(this.fovScale < 0.1){this.fovScale = 0.1;}
			fovLeft = this.hmd.getRecommendedEyeFieldOfView("left");
			fovRight = this.hmd.getRecommendedEyeFieldOfView("right");
			fovLeft.upDegrees *= this.fovScale;
			fovLeft.downDegrees *= this.fovScale;
			fovLeft.leftDegrees *= this.fovScale;
			fovLeft.rightDegrees *= this.fovScale;
			fovRight.upDegrees *= this.fovScale;
			fovRight.downDegrees *= this.fovScale;
			fovRight.leftDegrees *= this.fovScale;
			fovRight.rightDegrees *= this.fovScale;
			this.hmd.setFieldOfView(fovLeft, fovRight);
		}
		if('getRecommendedEyeRenderRect' in this.hmd){
			this.eyeViewport.left  = this.hmd.getRecommendedEyeRenderRect("left");
			this.eyeViewport.right = this.hmd.getRecommendedEyeRenderRect("right");
			this.viewport.width  = this.eyeViewport.left.width + this.eyeViewport.right.width;
			this.viewport.height = Math.max(this.eyeViewport.left.height, this.eyeViewport.right.height);
		}
		this.resize();
		if('getCurrentEyeFieldOfView' in this.hmd){
			this.fov.left  = this.hmd.getCurrentEyeFieldOfView("left");
			this.fov.right = this.hmd.getCurrentEyeFieldOfView("right");
		}else{
			this.fov.left  = this.hmd.getRecommendedEyeFieldOfView("left");
			this.fov.right = this.hmd.getRecommendedEyeFieldOfView("right");
		}
	}
	this.reset = function(){
		if(this.sensor != null){
			if('resetSensor' in this.sensor){
				this.sensor.resetSensor();
			}else if('zeroSensor' in this.sensor){
				this.sensor.zeroSensor();
			}
		}
	}
}

