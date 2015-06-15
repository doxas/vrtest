// ============================================================================
// # TODO
// * クォータニオンの正規化関連
// * フルスクリーン対応
// * ビューの設定がフォールバックして生きるか
// * ポジトラのチェック
// 
// 
// ============================================================================

var vr;
var Q = gl3.qtn.create();
var qt = gl3.qtn.create();
gl3.qtn.identity(qt);

window.onload = function(){
	// hmd
	vr = new HMD();
	function HMD(){
		this.ready = false;
		this.vrMode = false;
		this.sensor = null;
		this.hmd = null;
		this.viewport = {
			width: 1920,
			height: 1080
		};
		this.fov = {
			left: null,
			right: null
		};
		this.aspect = 1.0;
		this.near = 0.0;
		this.far = 0.0;
		this.pMatrix = {
			left: null,
			right: null
		};
		this.perspective = function(fov){
			var lt, rt, ut, dt;
			var dm = gl3.mat4.create();
			if(this.fov != null){
				lt = Math.tan(fov.leftDegrees  * Math.PI / 180.0);
				rt = Math.tan(fov.rightDegrees * Math.PI / 180.0);
				ut = Math.tan(fov.upDegrees    * Math.PI / 180.0);
				dt = Math.tan(fov.downDegrees  * Math.PI / 180.0);
			}else{
				lt = Math.tan(gl3.TRI.rad[45]);
				rt = Math.tan(gl3.TRI.rad[45]);
				ut = Math.tan(gl3.TRI.rad[50]);
				dt = Math.tan(gl3.TRI.rad[50]);
			}
			var xs = 2.0 / (lt + rt);
			var ys = 2.0 / (ut + dt);
			dm[0] = xs;  dm[4] = 0.0; dm[8]  = -((lt - rt) * xs * 0.5); dm[12] = 0.0;
			dm[1] = 0.0; dm[5] = ys;  dm[9]  = ((ut - dt) * ys * 0.5);  dm[13] = 0.0;
			dm[2] = 0.0; dm[6] = 0.0;
			dm[10] = this.far / (this.near - this.far);
			dm[14] = (this.far * this.near) / (this.near - this.far);
			dm[3] = 0.0; dm[7] = 0.0; dm[11] = -1.0; dm[15] = 0.0;
			return dm;
		};
		this.eyeTranslation = {
			left: null,
			right: null
		};
		this.eyeViewport = {
			left: null,
			right: null
		};
		this.init = function(callbackFunction){
			var tmp = this;
			if(navigator.getVRDevices){
				navigator.getVRDevices().then(callback, callbackFunction);
			}else{
				this.ready = false;
				return;
				console.log('not dvice');
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
		this.state = null;
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
			} else {
				this.aspect = window.innerWidth / window.innerHeight;
			}
		};
		this.fovScale = 1.0;
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
			this.pMatrix.left  = this.perspective(this.fov.left, 0.1, 1000);
			this.pMatrix.right = this.perspective(this.fov.right, 0.1, 1000);
		}
	}
	vr.init(init);
};


// ============================================================================
function init(){
	if(!vr.hmd){
		console.log('not dvice');
		return;
	}
	vr.resizeFov(0.0);
	
	// initialize
	gl3.initGL('canvas');
	if(!gl3.ready){console.log('initialize error'); return;}

	// canvas size
	gl3.canvas.width  = window.innerWidth;
	gl3.canvas.height = window.innerHeight;

	// event
	gl3.canvas.addEventListener('mousemove', mouseMove, false);
	window.addEventListener('keydown', keyDown, false);
	document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
	document.addEventListener("mozfullscreenchange", onFullscreenChange, false);

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
	var torusData = gl3.mesh.torus(64, 64, 0.2, 0.5);
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

	// matrix
	mMatrix = gl3.mat4.identity(gl3.mat4.create());
	vMatrix = gl3.mat4.identity(gl3.mat4.create());
	pMatrix = gl3.mat4.identity(gl3.mat4.create());
	vpMatrix = gl3.mat4.identity(gl3.mat4.create());
	mvpMatrix = gl3.mat4.identity(gl3.mat4.create());
	invMatrix = gl3.mat4.identity(gl3.mat4.create());
	qMatrix = gl3.mat4.identity(gl3.mat4.create());

	// depth test
	gl3.gl.enable(gl3.gl.DEPTH_TEST);
	gl3.gl.depthFunc(gl3.gl.LEQUAL);
	gl3.gl.clearDepth(1.0);

	// rendering
	var count = 0;
	render();

	function render(){
		var _i, i, j;
		count++;
		gl3.canvas.width  = window.innerWidth;
		gl3.canvas.height = window.innerHeight;
		
		// vr
		if(!vr.update()){
			console.log('hmd update failed!');
			return;
		}
		gl3.qtn.identity(Q);
		gl3.qtn.rotate(
			vr.state.orientation.w,
			[
				vr.state.orientation.x,
				vr.state.orientation.y,
				vr.state.orientation.z
			],
			Q
		);
		gl3.qtn.toMatIV(Q, qMatrix);

		var sin = gl3.TRI.sin[count % 360] * 4.0;
		var lightPosition = [0.0, sin, 0.0];
		var cameraPosition = [];
		var centerPoint = [0.0, 0.0, 0.0];
		var cameraUpDirection = [];
		
		function renderMode(trans, view){
			var cam = [
				0.0  + trans[0],
				0.0  + trans[1],
				10.0 + trans[2],
			];
			gl3.qtn.toVecIII(cam, qt, cameraPosition);
			gl3.qtn.toVecIII([0.0, 1.0, 0.0], qt, cameraUpDirection);
			var camera = gl3.camera.create(
				cameraPosition,
				centerPoint,
				cameraUpDirection,
				45, 1.0, 0.1, 20.0
			);
			gl3.scene_clear([0.3, 0.3, 0.3, 1.0], 1.0);
			gl3.scene_view(camera, view[0], view[1], view[2], view[3]);
			gl3.mat4.vpFromCamera(camera, vMatrix, pMatrix, vpMatrix);
	
			// torus rendering
			prg.set_program();
			prg.set_attribute(torusVBO, torusIBO);
			var radian = gl3.TRI.rad[count % 360];
			var axis = [0.0, 1.0, 0.0];
			gl3.mat4.identity(mMatrix);
			gl3.mat4.multiply(mMatrix, qMatrix, mMatrix);
			gl3.mat4.rotate(mMatrix, radian, axis, mMatrix);
			gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
			gl3.mat4.inverse(mMatrix, invMatrix);
			var ambientColor = [0.1, 0.1, 0.1, 0.0];
			prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
			gl3.draw_elements(gl3.gl.TRIANGLES, torusData.index.length);
	
			// sphere rendering
			prg.set_program();
			prg.set_attribute(sphereVBO, sphereIBO);
			axis = [0.0, 1.0, 0.0];
			for(i = 0; i < 3; i++){
				for(j = 0; j < 8; j++){
					var offset = [i + 1.0, 0.0, 0.0];
					radian = gl3.TRI.rad[j * 45];
					gl3.mat4.identity(mMatrix);
					gl3.mat4.multiply(mMatrix, qMatrix, mMatrix);
					gl3.mat4.rotate(mMatrix, radian, axis, mMatrix);
					gl3.mat4.translate(mMatrix, offset, mMatrix);
					gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
					gl3.mat4.inverse(mMatrix, invMatrix);
					prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
					gl3.draw_elements(gl3.gl.TRIANGLES, sphereData.index.length);
				}
			}
		}
		if(vr.vrMode){
			renderMode(
				[
					vr.eyeTranslation.left.x,
					vr.eyeTranslation.left.y,
					vr.eyeTranslation.left.z
				],
				[
					vr.eyeViewport.left.left,
					vr.eyeViewport.left.top,
					vr.eyeViewport.left.width,
					vr.eyeViewport.left.height
				]
			);
			renderMode(
				[
					vr.eyeTranslation.right.x,
					vr.eyeTranslation.right.y,
					vr.eyeTranslation.right.z
				],
				[
					vr.eyeViewport.right.left,
					vr.eyeViewport.right.top,
					vr.eyeViewport.right.width,
					vr.eyeViewport.right.height
				]
			);
		}else{
			renderMode(
				[0.0, 0.0, 0.0],
				[0, 0, gl3.canvas.width, gl3.canvas.height]
			);
		}
		requestAnimationFrame(render);
	}
}

function mouseMove(eve) {
	var cw = gl3.canvas.width;
	var ch = gl3.canvas.height;
	var wh = 1 / Math.sqrt(cw * cw + ch * ch);
	var x = eve.clientX - gl3.canvas.offsetLeft - cw * 0.5;
	var y = eve.clientY - gl3.canvas.offsetTop - ch * 0.5;
	var sq = Math.sqrt(x * x + y * y);
	var r = sq * 2.0 * Math.PI * wh;
	if (sq != 1) {
		sq = 1 / sq;
		x *= sq;
		y *= sq;
	}
	gl3.qtn.rotate(r, [y, x, 0.0], qt);
}

function keyDown(eve){
	if(eve.keyCode === 13){
		vr.vrMode = true;
		vr.resize();
		if(gl3.canvas.webkitRequestFullscreen) {
			gl3.canvas.webkitRequestFullscreen();
//			gl3.canvas.webkitRequestFullscreen({vrDisplay: vr.hmd});
		}else if(gl3.canvas.mozRequestFullScreen){
			gl3.canvas.mozRequestFullScreen();
//			gl3.canvas.mozRequestFullScreen({vrDisplay: vr.hmd});
		}
	}
}

function onFullscreenChange() {
	if(!document.webkitFullscreenElement && !document.mozFullScreenElement) {
		vr.vrMode = false;
	}
	vr.resize();
}


function fullscreenRequest(){
	if(document.requestFullscreen){
		document.requestFullscreen();
		vr.vrMode = true;
	}else if(document.webkitRequestFullscreen){
		document.webkitRequestFullscreen();
		vr.vrMode = true;
	}else if(document.mozRequestFullscreen){
		document.mozRequestFullscreen();
		vr.vrMode = true;
	}else if(document.msRequestFullscreen){
		document.msRequestFullscreen();
		vr.vrMode = true;
	}
	vr.resize();
}



// ============================================================================================================================================================

//
// WebVR Device initialization
//
//var sensorDevice = null;
//var hmdDevice = null;
//var vrMode = false;
//var renderTargetWidth = 1920;
//var renderTargetHeight = 1080;
//
//function PerspectiveMatrixFromVRFieldOfView(fov, zNear, zFar) {
//	var outMat = new THREE.Matrix4();
//	var out = outMat.elements;
//	var upTan, downTan, leftTan, rightTan;
//	if (fov == null) {
//		// If no FOV is given plug in some dummy values
//		upTan = Math.tan(50 * Math.PI/180.0);
//		downTan = Math.tan(50 * Math.PI/180.0);
//		leftTan = Math.tan(45 * Math.PI/180.0);
//		rightTan = Math.tan(45 * Math.PI/180.0);
//	} else {
//		upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
//		downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
//		leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
//		rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);
//	}
//
//	var xScale = 2.0 / (leftTan + rightTan);
//	var yScale = 2.0 / (upTan + downTan);
//
//	out[0] = xScale;
//	out[4] = 0.0;
//	out[8] = -((leftTan - rightTan) * xScale * 0.5);
//	out[12] = 0.0;
//
//	out[1] = 0.0;
//	out[5] = yScale;
//	out[9] = ((upTan - downTan) * yScale * 0.5);
//	out[13] = 0.0;
//
//	out[2] = 0.0;
//	out[6] = 0.0;
//	out[10] = zFar / (zNear - zFar);
//	out[14] = (zFar * zNear) / (zNear - zFar);
//
//	out[3] = 0.0;
//	out[7] = 0.0;
//	out[11] = -1.0;
//	out[15] = 0.0;
//
//	return outMat;
//}
//
//var cameraLeft = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
//var cameraRight = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
//
//var fovScale = 1.0;
//function resizeFOV(amount) {
//	var fovLeft, fovRight;
//
//	if (!hmdDevice) { return; }
//
//	if (amount != 0 && 'setFieldOfView' in hmdDevice) {
//		fovScale += amount;
//		if (fovScale < 0.1) { fovScale = 0.1; }
//
//		fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
//		fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");
//
//		fovLeft.upDegrees *= fovScale;
//		fovLeft.downDegrees *= fovScale;
//		fovLeft.leftDegrees *= fovScale;
//		fovLeft.rightDegrees *= fovScale;
//
//		fovRight.upDegrees *= fovScale;
//		fovRight.downDegrees *= fovScale;
//		fovRight.leftDegrees *= fovScale;
//		fovRight.rightDegrees *= fovScale;
//
//		hmdDevice.setFieldOfView(fovLeft, fovRight);
//	}
//
//	if ('getRecommendedEyeRenderRect' in hmdDevice) {
//		var leftEyeViewport = hmdDevice.getRecommendedEyeRenderRect("left");
//		var rightEyeViewport = hmdDevice.getRecommendedEyeRenderRect("right");
//		renderTargetWidth = leftEyeViewport.width + rightEyeViewport.width;
//		renderTargetHeight = Math.max(leftEyeViewport.height, rightEyeViewport.height);
//		document.getElementById("renderTarget").innerHTML = renderTargetWidth + "x" + renderTargetHeight;
//	}
//
//	resize();
//
//	if ('getCurrentEyeFieldOfView' in hmdDevice) {
//		fovLeft = hmdDevice.getCurrentEyeFieldOfView("left");
//		fovRight = hmdDevice.getCurrentEyeFieldOfView("right");
//	} else {
//		fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
//		fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");
//	}
//
//	cameraLeft.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovLeft, 0.1, 1000);
//	cameraRight.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovRight, 0.1, 1000);
//}
//
//function resetSensor() {
//	if (sensorDevice) {
//		if ('resetSensor' in sensorDevice) {
//			sensorDevice.resetSensor();
//		} else if ('zeroSensor' in sensorDevice) {
//			sensorDevice.zeroSensor();
//		}
//	}
//}
//
//function EnumerateVRDevices(devices) {
//	// First find an HMD device
//	for (var i = 0; i < devices.length; ++i) {
//		if (devices[i] instanceof HMDVRDevice) {
//			hmdDevice = devices[i];
//
//			var eyeOffsetLeft = hmdDevice.getEyeTranslation("left");
//			var eyeOffsetRight = hmdDevice.getEyeTranslation("right")
//				document.getElementById("leftTranslation").innerHTML = printVector(eyeOffsetLeft);
//			document.getElementById("rightTranslation").innerHTML = printVector(eyeOffsetRight);
//
//			cameraLeft.position.add(eyeOffsetLeft);
//			cameraLeft.position.z = 12;
//
//			cameraRight.position.add(eyeOffsetRight);
//			cameraRight.position.z = 12;
//
//			resizeFOV(0.0);
//		}
//	}
//
//	// Next find a sensor that matches the HMD hardwareUnitId
//	for (var i = 0; i < devices.length; ++i) {
//		if (devices[i] instanceof PositionSensorVRDevice &&
//				(!hmdDevice || devices[i].hardwareUnitId == hmdDevice.hardwareUnitId)) {
//			sensorDevice = devices[i];
//			document.getElementById("hardwareUnitId").innerHTML = sensorDevice.hardwareUnitId;
//			document.getElementById("deviceId").innerHTML = sensorDevice.deviceId;
//			document.getElementById("deviceName").innerHTML = sensorDevice.deviceName;
//			resetSensor();
//		}
//	}
//}
//
//if (navigator.getVRDevices) {
//	navigator.getVRDevices().then(EnumerateVRDevices);
//} else if (navigator.mozGetVRDevices) {
//	navigator.mozGetVRDevices(EnumerateVRDevices);
//} else {
//	stats.classList.add("error");
//	stats.innerHTML = "WebVR API not supported";
//}
//
//window.addEventListener("keydown", function(ev) {
//	if (hmdDevice) {
//		if (ev.keyCode == "R".charCodeAt(0))  {
//			resetSensor();
//		}
//		if (ev.keyCode == 187 || ev.keyCode == 61)  { // "+" key
//			resizeFOV(0.1);
//		}
//		if (ev.keyCode == 189 || ev.keyCode == 173)  { // "-" key
//			resizeFOV(-0.1);
//		}
//	}
//});
//
////
//// Rendering
////
//var renderer = new THREE.WebGLRenderer();
//var scene = new THREE.Scene();
//var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
//
//renderer.setClearColor(0x202020, 1.0);
//
//var ambient = new THREE.AmbientLight( 0x444444 );
//scene.add( ambient );
//
//var directionalLight = new THREE.DirectionalLight( 0xffeedd );
//directionalLight.position.set( 0, 0, 1 ).normalize();
//scene.add( directionalLight );
//
//var riftObj = new THREE.Object3D();
//scene.add(riftObj);
//
//var rift = null;
//
//camera.position.z = 12;
//
//function resize() {
//	if (vrMode) {
//		camera.aspect = renderTargetWidth / renderTargetHeight;
//		camera.updateProjectionMatrix();
//		renderer.setSize( renderTargetWidth, renderTargetHeight );
//	} else {
//		camera.aspect = window.innerWidth / window.innerHeight;
//		camera.updateProjectionMatrix();
//		renderer.setSize( window.innerWidth, window.innerHeight );
//	}
//}
//resize();
//window.addEventListener("resize", resize, false);
//
//renderer.domElement.addEventListener("touchstart", function(ev) {
//	resetSensor();
//});
//
//// Fullscreen VR mode handling
//
//function onFullscreenChange() {
//	if(!document.webkitFullscreenElement && !document.mozFullScreenElement) {
//		vrMode = false;
//	}
//	resize();
//}
//
//document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
//document.addEventListener("mozfullscreenchange", onFullscreenChange, false);
//
//var vrBtn = document.getElementById("vrBtn");
//if (vrBtn) {
//	vrBtn.addEventListener("click", function() {
//		vrMode = true;
//		resize();
//		if (renderer.domElement.webkitRequestFullscreen) {
//			renderer.domElement.webkitRequestFullscreen({ vrDisplay: hmdDevice });
//		} else if (renderer.domElement.mozRequestFullScreen) {
//			renderer.domElement.mozRequestFullScreen({ vrDisplay: hmdDevice });
//		}
//	}, false);
//}
//
////
//// Update Loop
////
//
//var timestamp = document.getElementById("timestamp");
//var orientation = document.getElementById("orientation");
//var position = document.getElementById("position");
//var angularVelocity = document.getElementById("angularVelocity");
//var linearVelocity = document.getElementById("linearVelocity");
//var angularAcceleration = document.getElementById("angularAcceleration");
//var linearAcceleration = document.getElementById("linearAcceleration");
//
//function updateVRDevice() {
//	if (!sensorDevice) return false;
//	var vrState = sensorDevice.getState();
//
//	timestamp.innerHTML = vrState.timeStamp.toFixed(2);
//	orientation.innerHTML = printVector(vrState.orientation);
//	position.innerHTML = printVector(vrState.position);
//	angularVelocity.innerHTML = printVector(vrState.angularVelocity);
//	linearVelocity.innerHTML = printVector(vrState.linearVelocity);
//	angularAcceleration.innerHTML = printVector(vrState.angularAcceleration);
//	linearAcceleration.innerHTML = printVector(vrState.linearAcceleration);
//
//	if (riftObj) {
//		if (vrState.position) {
//			riftObj.position.x = vrState.position.x * VR_POSITION_SCALE;
//			riftObj.position.y = vrState.position.y * VR_POSITION_SCALE;
//			riftObj.position.z = vrState.position.z * VR_POSITION_SCALE;
//		}
//
//		if (vrState.orientation) {
//			riftObj.quaternion.x = vrState.orientation.x;
//			riftObj.quaternion.y = vrState.orientation.y;
//			riftObj.quaternion.z = vrState.orientation.z;
//			riftObj.quaternion.w = vrState.orientation.w;
//		}
//	}
//
//	return true;
//}
//
//function render(t) {
//	requestAnimationFrame(render);
//
//	if (!updateVRDevice() && rift) {
//		// If we don't have a VR device just spin the model around to give us
//		// something pretty to look at.
//		rift.rotation.y += 0.01;
//	}
//
//	if (vrMode) {
//		// Render left eye
//		renderer.enableScissorTest ( true );
//		renderer.setScissor( 0, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.setViewport( 0, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.render(scene, cameraLeft);
//
//		// Render right eye
//		renderer.setScissor( renderTargetWidth / 2, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.setViewport( renderTargetWidth / 2, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.render(scene, cameraRight);
//	} else {
//		// Render mono view
//		renderer.enableScissorTest ( false );
//		renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
//		renderer.render(scene, camera);
//	}
//}
//document.body.appendChild( renderer.domElement );
//render();
