/**
 * Tweaked version of CopyShader, where a scale factor is applied
 */


( function () {

	/**
 * Full-screen textured quad shader
 */
	var CopyScaleShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'opacity': {
				value: 1.0
			},
      'scale': {
        value: new THREE.Vector2(1, 1)
      }
		},
		vertexShader:
  /* glsl */
  `
    uniform vec2 scale;
		varying vec2 vUv;

		void main() {

			vUv = 0.5 + scale * (uv - 0.5);
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;

		}`
	};

	THREE.CopyScaleShader = CopyScaleShader;

} )();
