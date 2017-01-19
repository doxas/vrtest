/* webvr api wrapper ----------------------------------------------------------
 * TODO:
 *   script.js
 * ---------------------------------------------------------------------------- */

/* MEMO -----------------------------------------------------------------------
 * VRDisplayCapabirities
 *  {bool} hasPosition
 *  {bool} hasOrientation
 *  {bool} hasExternalDisplay
 *  {bool} canPresent
 *  {long} maxLayers
 *
 * VRFrameData
 *  {DOMHighResTimeStamp} timestamp
 *  {Float32Array}        leftProjectionMatrix
 *  {Float32Array}        leftViewMatrix
 *  {Float32Array}        rightProjectionMatrix
 *  {Float32Array}        rightViewMatrix
 *  {VRPose}              pose
 *
 * VRPose
 *  {Float32Array} position
 *  {Float32Array} linearVelocity
 *  {Float32Array} linearAcceleration
 *  {Float32Array} orientation
 *  {Float32Array} angularVelocity
 *  {Float32Array} angularAcceleration
 *
 * VRFieldOfView
 *  {double} upDegrees
 *  {double} rightDegrees
 *  {double} downDegrees
 *  {double} leftDegrees
 *
 * VREyeParameters
 *  {Float32Array}  offset
 *  {VRFieldOfView} fieldOfView
 *  {unsigned long} renderWidth
 *  {unsigned long} renderHeight
 *
 * VRStageParameters
 *  {Float32Array} sittingToStandingTransform
 *  {float}        sizeX
 *  {float}        sizeZ
 *
 * Window Events
 *  onvrdisplayconnect
 *  onvrdisplaydisconnect
 *  onvrdisplayactivate
 *  onvrdisplaydeactivate
 *  onvrdisplayblur
 *  onvrdisplayfocus
 *  onvrdisplaypresentchange
 *
 * ---------------------------------------------------------------------------- */

/* EXAMPLE --------------------------------------------------------------------
 *
 * var frameData = new VRFrameData();
 *
 * // Render a single frame of VR data.
 * function onVRFrame() {
 *     // Schedule the next frame’s callback
 *     vrDisplay.requestAnimationFrame(onVRFrame);
 *
 *     // Poll the VRDisplay for the current frame’s matrices and pose
 *     vrDisplay.getFrameData(frameData);
 *
 *     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 *     // Render to the left eye’s view to the left half of the canvas
 *     gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
 *     gl.uniformMatrix4fv(projectionMatrixLocation, false, frameData.leftProjectionMatrix);
 *     gl.uniformMatrix4fv(viewMatrixLocation, false, frameData.leftViewMatrix);
 *     drawGeometry();
 *
 *     // Render to the right eye’s view to the right half of the canvas
 *     gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
 *     gl.uniformMatrix4fv(projectionMatrixLocation, false, frameData.rightProjectionMatrix);
 *     gl.uniformMatrix4fv(viewMatrixLocation, false, frameData.rightViewMatrix);
 *     drawGeometry();
 *
 *     // Indicate that we are ready to present the rendered frame to the VRDisplay
 *     vrDisplay.submitFrame();
 * }
 *
 * // Begin presentation (must be called within a user gesture)
 * vrDisplay.requestPresent([{ source: canvas }]).then(function() {
 *     vrDisplay.requestAnimationFrame(onVRFrame);
 * });
 *
 * ---------------------------------------------------------------------------- */

/* WEV class ------------------------------------------------------------------ */
class WEV {
    /* @constructor
     * @param {function} [callbackFunction] - optional (or set to init method)
     */
    contructor(callbackFunction){
        this.ready        = false;
        this.vrMode       = false;
        this.display      = null;
        this.capabirities = null;
        this.layers       = null;
        this.activeLayer  = null;
        this.isConnected  = false;
        this.isPresenting = false;
        this.requestAnimationFrame = window.requestAnimationFrame;

        this.callback = null;
        if(callbackFunction){
            this.callback = callbackFunction;
            this.init();
        }
    }
    /* initialize WEV
     * @param {function} callbackFunction - callback funciton
     */
    init(callbackFunction){
        if(callbackFunction){this.callback = callbackFunction;}
        if(navigator.getVRDisplays){
            // get vr display
            navigator.getVRDisplays().then((display)=>{
                let i, j;
                for(i = 0, j = display.length; i < j; ++i){
                    if(display[i] instanceof VRDisplay){
                        this.display = display[i];
                        this.capabirities = this.display.capabirities;
                        this.isConnected = this.display.isConnected;
                        this.isPresenting = this.display.isPresenting;
                        this.layers = this.display.getLayers();
                        this.requestAnimationFrame = this.display.requestAnimationFrame;
                        console.log('◆ vr find display: ' + i);
                        console.log(display[i]);
                        if(this.layers != null && this.layers.hasOwnProperty('length') && this.layers.length > 0){
                            this.activeLayer = this.layers[0];
                        }else{
                            console.warn('◆ not find layer');
                        }
                        break;
                    }
                }
                this.ready = true;
                if(this.callback){callbackFunction(display[i]);}
            }).catch(()=>{
                this.ready = false;
                console.log('◆ native error (getVRDisplays called)');
                if(this.callback){callbackFunction(null);}
            });
        }else{
            this.ready = false;
            console.log('◆ vr display not found');
            if(this.callback){callbackFunction(null);}
        }
    }

    /* reset pose
     */
    reset(){
        if(!this.display){return;}
        this.display.resetPose();
    }

    /* present to display
     * @param {VRLayer} layer - source layer
     * @return {Promise} - promise object or null
     */
    requestPresent(layer){
        if(!this.display){return null;}
        let sourceLayer = this.activeLayer;
        if(layer){sourceLayer = layer;}
        if(sourceLayer != null){
            return this.display.requestPresent(sourceLayer);
        }
    }

    /* exit presentation
     * @return {Promise} - promise object or null
     */
    exitPresent(){
        if(!this.display){return null;}
        return this.display.exitPresent();
    }

    /* submit from canvas to display
     * @param {VRPose} [pose] - optional
     */
    submitFrame(pose){
        if(!this.display){return;}
        this.display.submitFrame(pose);
    }

    /* request animation frame wrapper
     * @param {function} callback - callback function
     * @return {number<long>} - request handle
     */
    requestAnimationFrame(callback){
        return this.requestAnimationFrame(callback);
    }

    /* cancel of animation frame
     * @param {number<long>} handle - return value from requestAnimationFrame
     */
    cancelAnimationFrame(handle){
        this.display.cancelAnimationFrame(handle);
    }

    /* getters ---------------------------------------------------------------- */
    getDisplays(){
        if(!this.display){return null;}
        return this.display;
    }
    getDisplayId(){
        if(!this.display){return null;}
        return this.display.displayId;
    }
    getDisplayName(){
        if(!this.display){return null;}
        return this.display.displayName;
    }
    getLayers(){
        if(!this.display){return null;}
        return this.display.getLayers();
    }
    getCapabirities(){
        if(!this.display){return null;}
        return this.display.capabirities;
    }
    getStageParameters(){
        if(!this.display){return null;}
        return this.display.VRStageParameters;
    }
    getEyeParameters(){
        if(!this.display){return null;}
        return this.display.getEyeParameters();
    }
    getFrameData(){
        if(!this.display){return null;}
        return this.display.getFrameData();
    }
    getPose(){
        if(!this.display){return null;}
        return this.display.getPose();
    }
    getImmediatePose(){
        if(!this.display){return null;}
        return this.display.getImmediatePose();
    }
    getDepthNear(){
        if(!this.display){return null;}
        return this.display.depthNear;
    }
    getDepthFar(){
        if(!this.display){return null;}
        return this.display.depthFar;
    }

    /* util ------------------------------------------------------------------- */
    /* return default bounds setting
     * @return {object} left bounds and right bounds
     */
    getDefaultBounds(){
        return {
            left:  [0.0, 0.0, 0.5, 1.0],
            right: [0.5, 0.0, 0.5, 1.0]
        };
    }
    /* get layer bounds (all value range of 0.0 to 1.0)
     * @param {number} [index] - index number
     * @return {object} left bounds and right bounds
     */
    getBounds(index){
        if(!this.display){return null;}
        let sourceLayer = this.activeLayer;
        if(index != null && this.layers[index] != null && index < this.capabirities.maxLayers){
            sourceLayer = this.layers[index];
        }
        return {
            left: sourceLayer.leftBounds,
            right: sourceLayer.rightBounds
        };
    }
    /* get viewport size
     * @return {object} viewport width and height
     */
    getViewport(){
        if(!this.display){return null;}
        const leftEye  = this.display.getEyeParameters('left');
        const rightEye = this.display.getEyeParameters('right');
        return {
            width: Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2,
            height: Math.max(leftEye.renderHeight, rightEye.renderHeight)
        };
    }
    /* from VRPose to view matrix
     * @param {VRPose} pose - VRPose object
     * @return {Float32Array} - view matrix (4x4)
     */
    generateViewMatrix(pose){
        let out = new Float32Array(16);
        let q = [0.0, 0.0, 0.0, 1.0];
        let v = [0.0, 0.0, 0.0];
        if(!pose){return null;}
        if(pose.orientation){q = pose.orientation;}
        if(pose.position){v = pose.position;}
        const x2 = q[0] + q[0], y2 = q[1] + q[1], z2 = q[2] + q[2];
        const xx = q[0] * x2;
        const xy = q[0] * y2;
        const xz = q[0] * z2;
        const yy = q[1] * y2;
        const yz = q[1] * z2;
        const zz = q[2] * z2;
        const wx = q[3] * x2;
        const wy = q[3] * y2;
        const wz = q[3] * z2;
        out[0]  = 1.0 - (yy + zz);
        out[1]  = xy + wz;
        out[2]  = xz - wy;
        out[3]  = 0.0;
        out[4]  = xy - wz;
        out[5]  = 1.0 - (xx + zz);
        out[6]  = yz + wx;
        out[7]  = 0.0;
        out[8]  = xz + wy;
        out[9]  = yz - wx;
        out[10] = 1.0 - (xx + yy);
        out[11] = 0.0;
        out[12] = v[0];
        out[13] = v[1];
        out[14] = v[2];
        out[15] = 1.0;
        return out;
    }
    /* from VRFieldOfView to projection matrix
     * @param {VRFieldOfView}
     * @return {Float32Array} - projection matrix (4x4)
     */
    generateProjectionMatrix(fov, near, far){
        const upTan    = Math.tan(fov.upDegrees * Math.PI / 180.0);
        const downTan  = Math.tan(fov.downDegrees * Math.PI / 180.0);
        const leftTan  = Math.tan(fov.leftDegrees * Math.PI / 180.0);
        const rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
        const xScale   = 2.0 / (leftTan + rightTan);
        const yScale   = 2.0 / (upTan + downTan);
        let out = new Float32Array(16);
        out[0] = xScale;
        out[1] = 0.0;
        out[2] = 0.0;
        out[3] = 0.0;
        out[4] = 0.0;
        out[5] = yScale;
        out[6] = 0.0;
        out[7] = 0.0;
        out[8] = -((leftTan - rightTan) * xScale * 0.5);
        out[9] = ((upTan - downTan) * yScale * 0.5);
        out[10] = -(near + far) / (far - near);
        out[11] = -1.0;
        out[12] = 0.0;
        out[13] = 0.0;
        out[14] = -(2.0 * far * near) / (far - near);
        out[15] = 0.0;
        return out;
    }
}


