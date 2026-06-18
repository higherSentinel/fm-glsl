
// FM-shader
#define M_PI 			3.14159265358979
#define F_START         (f_carrier-f_spread)
#define F_END           (f_carrier+f_spread)
#define OMEGA_START     (2*M_PI*F_START)
#define OMEGA_END       (2*M_PI*F_END)
#define OMEGA_CARRIER   (2*M_PI*f_carrier)

out vec4 fragColor;

// take stuff from outside
uniform float f_carrier;
uniform float f_spread;
uniform float gain;
uniform float t_offset;
uniform float qtz;
uniform float alpha;

// map func
float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

void main()
{
	float omega = 0;
	float phase = 0;
	float sam = 0;
	float dem = 0;
	ivec2 cur_p_cor = ivec2(gl_FragCoord.xy);
	float t = vUV.s;
	vec4 input_color = texelFetch(sTD2DInputs[0], ivec2(0,cur_p_cor.y), 0);
	float input_gs = (input_color.r + input_color.g + input_color.b) / 3.0;
	float dem_filt = map(gain*input_gs, 0.0, 1.0, OMEGA_START, OMEGA_END);
	
	// low perf part here, maybe compute shader in the future?
	for(int c = 0; c < cur_p_cor.x; c++)
	{
		input_color = texelFetch(sTD2DInputs[0], ivec2(c,cur_p_cor.y), 0);
		input_gs = (input_color.r + input_color.g + input_color.b) / 3.0;
		// compute omega first
		omega = map(gain*input_gs, 0.0, 1.0, OMEGA_START, OMEGA_END);
		phase += omega;
		
		// take a sample
		sam = sin((OMEGA_CARRIER * (t-t_offset)) + phase);
		
		// quantize
		sam = map(int(map(sam, -1, 1, 0, qtz)), 0, qtz, -1, 1);
		
		// demodulate
		dem = abs(sam);
		
		// lpf
        dem_filt = (alpha * dem) + ((1-alpha) * dem_filt);
	}
	
	input_color = texture(sTD2DInputs[0], vUV.st);
	input_gs = (input_color.r + input_color.g + input_color.b) / 3.0;
	dem_filt = dem_filt > 1? 1 : dem_filt;
	dem_filt = dem_filt < 0? 0 : dem_filt;
	
	vec4 o_color = vec4(dem_filt);
	o_color.a = 1.0; 
		
	fragColor = TDOutputSwizzle(o_color);
}
