const lifeModule = (() => {
	const
		startColors = [ 255, 127, 127 ];	// active cell's start color
		life_wrap = document.getElementById( 'lifeWrap' ),
		life = document.getElementById( 'life' ),
		html_play = '<i class="fa fa-play" aria-hidden="true"></i>',
		html_stop = '<i class="fa fa-stop" aria-hidden="true"></i>',
		bttype = [ 'pl', 'st', 'fs', 'rd', 'dl', 'mu', 'md', 'ml', 'mr', 'zm', 'ft', 'im', 'ex', 'mc' ],
		tx_if = document.getElementById( 'info' ),
		tx_im = document.getElementById( 'import_area' ),
		tx_ex =  document.getElementById( 'export_area' ),
		sl_set = document.getElementById( 'sl_set' ),
		modal = document.getElementById( 'modal' );

	let
		bt = [],
		start_flg = true,
		gen = 0,
		rate = 0,
		nowColors = startColors,
		shiftPlan = [
			[  0,  1,  0 ],		// nowShift = 0; activeShift = ( 7 - nowShift ) % 3 = 1
			[ -1,  0,  0 ],		// nowShift = 1; activeShift = ( 7 - nowShift ) % 3 = 0
			[  0,  0,  1 ],		// nowShift = 2; activeShift = ( 7 - nowShift ) % 3 = 2
			[  0, -1,  0 ],		// nowShift = 3; activeShift = ( 7 - nowShift ) % 3 = 1
			[  1,  0,  0 ],		// nowShift = 4; activeShift = ( 7 - nowShift ) % 3 = 0
			[  0,  0, -1 ]		// nowShift = 5; activeShift = ( 7 - nowShift ) % 3 = 2
		],
		nowShift = 0,
		activeShift,
		data = [], dataNext = [], dataDefault = [], dataMatrix = [],
		DoA, z, z2, z_u, z_m, z_b, z_l, z_c, z_r,
		grid_x, grid_y, rgb,
		plus = ( r1, r2 ) => {
			while ( r2 ){
				carry = ( r1 & r2 ) << 1;
				r1 ^= r2;
				r2 = carry;
			}
			return r1;
		},
		minus = ( r1, r2 ) => {
			while ( r2 ){
				carry = ( ~r1 & r2 ) << 1;
				r1 ^= r2;
				r2 = carry;
			}
			return r1;
		},
		toRGB = cols => {
			return ( ( cols[0] << 16 ) + ( cols[1] << 8 ) + cols[2] );
		},
		addMultiEventListener = ( $targets, events, func, bl ) => {
			$targets.forEach( $target => {
				if ( Array.isArray(events) ) {
					events.forEach( event => {
						$target.addEventListener( event, func, bl );
					} );
				} else {
					$target.addEventListener( events, func, bl );
				}
			} );
		};

	bttype.forEach( v => bt[v] = document.getElementById( 'bt_' + v ) );

	/* PIXI.js Setting */
	const type = PIXI.utils.isWebGLSupported() ? 'WebGL': 'canvas';
	PIXI.utils.sayHello(type);
	let
		stage_cv = new PIXI.Container(),
		renderer_cv = new PIXI.autoDetectRenderer(
			2048,
			1024,
			{
				view: life,
				transparent: true
			}
		);
	life.width = 2048;
	life.height = 1024;
	life_wrap.style.maxWidth = 2048 + 'px';
	life_wrap.style.maxHeight = 1024 + 'px';

	// make graphic
	let graph_base = new PIXI.Graphics();
	graph_base.beginFill( 0xFFFFFF );
	graph_base.drawRect( 0, 0, 3, 3 );
	graph_base.endFill();

	// convert graphic into texture
	let
		tex = new PIXI.Texture( graph_base.generateCanvasTexture() ),
		texs_cv = [];

	// render
	renderer_cv.render(stage_cv);

	const func = {
		init: () => {
			func.resetRun();
			func.randomSet();
			func.playSet();
			func.deleteSet();
			func.modal();
			func.editRun();
			func.moveSet();
			func.zoomSet();
			func.setListSet();
			func.fastBackward();
			func.footprintSet();
		},

		/* -----------------------------
		// display information
		----------------------------- */
		information: () => {
			tx_if.innerHTML = 'GEN:' + gen + '<br>RATE:' + rate + '/131072 (' + ( ( rate / 13.1072 ) | 0 ) / 100 + '%)';
		},

		/* -----------------------------
		// Reset, initialize
		----------------------------- */
		resetRun: () => {
			document.body.onload = () => {
				nowColors = startColors;
				rgb = toRGB( nowColors );
				rate = 0;
				for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
					data[z] = 0;
					dataNext[z] = 0;
					texs_cv[z] = [];

					z_u = ( minus( z, 16 ) ) & 4080;
					z_m = z & 4080;
					z_b = ( plus( z, 16 ) ) & 4080;

					z_l = ( minus( z, 1 ) ) & 15;
					z_c = z & 15;
					z_r = ( plus( z, 1 ) ) & 15;

					dataMatrix[z] = [
						z_u | z_l, z_u | z_c, z_u | z_r,
						z_m | z_l, z_m | z_r,
						z_b | z_l, z_b | z_c, z_b | z_r
					];

					for ( z2 = 32; z2--; ) {
						grid_x = ( z << 5 & 511 | 31 ^ z2 ) << 2;
						grid_y = ( z >> 4 ) << 2;
						texs_cv[z][z2] = new PIXI.Sprite(tex);
						texs_cv[z][z2].position.x = grid_x;
						texs_cv[z][z2].position.y = grid_y;
						texs_cv[z][z2].alpha = 0;

						stage_cv.addChild( texs_cv[z][z2] );
					}
				}
				renderer_cv.render( stage_cv );
				gen = 0;
				func.information( gen, rate );
				if( start_flg ) bt.rd.click();
			};
		},

		/* -----------------------------
		// random
		----------------------------- */
		randomSet: () => {
			const randomRun = () => {
				nowColors = startColors;
				data = [];
				dataNext = [];
				rate = 0;
				for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
					data[z] = 0;
					dataNext[z] = 0;
					for ( z2 = 32; z2--; ) {
						DoA = ( Math.random() * 2 ) | 0;
						data[z] = data[z] | DoA << z2;
						dataNext[z] = dataNext[z] | DoA << z2;
						if( DoA ){
							texs_cv[z][z2].tint = toRGB( nowColors );
							texs_cv[z][z2].alpha = 1;
							rate = plus( rate, 1 );
						} else {
							texs_cv[z][z2].tint = 0x000000;
							texs_cv[z][z2].alpha = 0;
						}
					}
				}
				renderer_cv.render( stage_cv );
				gen = 0;
				func.information( gen );
				if( start_flg ){
					bt.pl.click();
					start_flg = false;
				}
			};
			bt.rd.addEventListener( 'click', randomRun, true );
		},

		/* -----------------------------
		// play, stop, stepplay
		----------------------------- */
		playSet: () => {
			let
				playTimer, matrix, carry,
				a, b, c, d, o, e, f, g, h,
				xab, xcd, xef, xgh, x,
				nextCell;
			const
				requestAnimationFrame =
					window.requestAnimationFrame ||
					window.webkitRequestAnimationFrame ||
					window.mozRequestAnimationFrame ||
					window.msRequestAnimationFrame ||
					window.oRequestAnimationFrame ||
					window.setTimeout,
				cancelAnimationFrame =
					window.cancelAnimationFrame ||
					window.cancelRequestAnimationFrame ||
					window.webkitCancelAnimationFrame ||
					window.webkitCancelRequestAnimationFrame ||
					window.mozCancelAnimationFrame ||
					window.mozCancelRequestAnimationFrame ||
					window.msCancelAnimationFrame ||
					window.msCancelRequestAnimationFrame ||
					window.oCancelAnimationFrame ||
					window.oCancelRequestAnimationFrame ||
					window.clearTimeout,
				playRun = sw => {
					if( !gen ){
						dataDefault = data.slice();
						activeShift = ( nowShift ^ 7 ) % 3;
					}
					if(
						( !( nowColors[activeShift] ^ 127 ) && shiftPlan[nowShift][activeShift] >> 31 ) ||
						( !( nowColors[activeShift] ^ 255 ) && shiftPlan[nowShift][activeShift] >> 31 ^ 1 )
					){
						nowShift = plus( nowShift, 1 ) % 6;
						activeShift = ( nowShift ^ 7 ) % 3;
					}
					nowColors[0] = plus( nowColors[0], shiftPlan[nowShift][0] );
					nowColors[1] = plus( nowColors[1], shiftPlan[nowShift][1] );
					nowColors[2] = plus( nowColors[2], shiftPlan[nowShift][2] );
					rgb = toRGB( nowColors );

					for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
						matrix = dataMatrix[z];
						b = data[matrix[1]];
						a = data[matrix[0]] << 31 | b >>> 1;
						c = b << 1 | data[matrix[2]] >>> 31;
						o = data[z];
						d = data[matrix[3]] << 31 | o >>> 1;
						e = o << 1 | data[matrix[4]] >>> 31;
						g = data[matrix[6]];
						f = data[matrix[5]] << 31 | g >>> 1;
						h = g << 1 | data[matrix[7]] >>> 31;

						if( !a && !b && !c && !d && !o && !e && !f && !g && !h ) continue;

						xab = a & b;
						a ^= b;
						xcd = c & d;
						c ^= d;
						xef = e & f;
						e ^= f;
						xgh = g & h;
						g ^= h;
						d = a & c;
						a ^= c;
						c = xab & xcd;
						b = xab ^ xcd ^ d;
						h = e & g;
						e ^= g;
						g = xef & xgh;
						f = xef ^ xgh ^ h;
						d = a & e;
						a ^= e;
						h = b & f;
						b ^= f;
						h |= b & d;
						b ^= d;
						c ^= g ^ h;
						x = ~c & b;

						DoA = dataNext[z] = x & a | o & x & ~a;

						for ( z2 = 31; z2 >= 0; z2 = minus( z2, 1 ) ) {
							nextCell = DoA >> z2 & 1;
							if( nextCell ^ data[z] >> z2 & 1 ){
								if( nextCell ){
									texs_cv[z][z2].tint = rgb;
									texs_cv[z][z2].alpha = 1;
									rate = plus( rate, 1 );
								} else {
									texs_cv[z][z2].tint = 0x000000;
									texs_cv[z][z2].alpha = 0;
									rate = minus( rate, 1 );
								}
							}
						}
					}
					renderer_cv.render( stage_cv );
					gen = plus( gen, 1 );
					func.information( gen, rate );
					data = dataNext.slice();
					if( sw == 'play' ) playTimer = requestAnimationFrame( () => playRun( sw ) ,100 );
				},
				playTrriger = e => {
					if( e.currentTarget.value == 'play' ){
						e.currentTarget.value = 'stop';
						e.currentTarget.innerHTML = html_stop;
						playRun( 'play' );
					} else if( e.currentTarget.value == 'stop' ){
						e.currentTarget.value = 'play';
						e.currentTarget.innerHTML = html_play;
						cancelAnimationFrame( playTimer );
					} else {
						if( bt.pl.value == 'stop' ) bt.pl.click();
						playRun( 'step' );
					}
				};
			addMultiEventListener(
				[ bt.st, bt.pl ], 'click', playTrriger, true
			);
		},

		/* -----------------------------
		// Editing
		----------------------------- */
		editRun: () => {
			let
				active = 0, eX, eY, rect;
			const edit = e => {
				rect = life_wrap.getBoundingClientRect();
				eX = e.changedTouches ? e.changedTouches[0].pageX : e.clientX;
				eY = e.changedTouches ? e.changedTouches[0].pageY : e.clientY;
				if( bt.zm.value == 'zoomout' ){
					grid_x = ( eX - rect.left - window.pageXOffset ) >>> 2;
					grid_y = ( eY - rect.top - window.pageYOffset ) >>> 2;
				} else {
					grid_x = eX - rect.left - window.pageXOffset;
					grid_y = eY - rect.top - window.pageYOffset;
				}
				z = ( grid_x >>> 5 ) | ( grid_y << 4 );
				z2 = 31 ^ ( grid_x & 31 );
				if( e.type === 'mousedown' || e.type === 'touchstart' ){
					active = 1;
					DoA = ( data[z] >>> z2 & 1 ) ^ 1;
				} else if( e.type === 'mouseup' || e.type === 'touchend' || e.type === 'mouseout'){
					active = 0;
				}
				if( active ){
					if( DoA ^ ( data[z] >>> z2 & 1 ) ){
						data[z] = ( data[z] & ( 4294967295 ^ ( 1 << z2 ) ) ) | ( DoA << z2 );
						if( DoA ){
							texs_cv[z][z2].tint = rgb;
							texs_cv[z][z2].alpha = 1;
							rate = plus( rate, 1 );
						} else {
							texs_cv[z][z2].tint = 0x000000;
							texs_cv[z][z2].alpha = 0;
							rate = minus( rate, 1 );
						}
					}
				}
				renderer_cv.render( stage_cv );
				func.information( gen, rate );
			};

			addMultiEventListener(
				[ life_wrap ],
				[ 'mouseup', 'mousedown', 'mousemove', 'mouseout', 'touchend', 'touchstart', 'touchmove' ],
				edit, false
			);
		},

		/* -----------------------------
		// Delete All
		----------------------------- */
		deleteSet: () => {
			const deleteRun = () => {
				if( bt.pl.value == 'stop' ) bt.pl.click();
				for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
					data[z] = 0;
					dataNext[z] = 0;
					for ( z2 = 32; z2--; ) {
						texs_cv[z][z2].tint = 0x000000;
						texs_cv[z][z2].alpha = 0;
					}
				}
				renderer_cv.render( stage_cv );
				rate = 0;
				gen = 0;
				func.information( gen );
			};
			bt.dl.addEventListener( 'click', deleteRun, false );
		},

		/* -----------------------------
		// Move
		----------------------------- */
		moveSet: () => {
			let arrFront, arrRear, moveTimer;
			const
				moveRun = direction => {
					if( direction == 'up' ){
						arrFront = data.slice( 16, 4096 );
						arrRear = data.slice( 0, 16 );
						dataNext = arrFront.concat( arrRear );
					} else if( direction == 'down' ){
						arrFront = data.slice( 4080, 4096 );
						arrRear = data.slice( 0, 4080 );
						dataNext = arrFront.concat( arrRear );
					} else if( direction == 'left' ){
						for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
							dataNext[z] = data[z] << 1 | data[dataMatrix[z][4]] >>> 31;
						}
					} else if( direction == 'right' ){
						for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
							dataNext[z] = data[dataMatrix[z][3]] << 31 | data[z] >>> 1;
						}
					}

					data = dataNext.slice();
					for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
						for ( z2 = 32; z2--; ) {
							if( data[z] >> z2 & 1 ){
								texs_cv[z][z2].tint = rgb;
								texs_cv[z][z2].alpha = 1;
							} else {
								texs_cv[z][z2].tint = 0x000000;
								texs_cv[z][z2].alpha = 0;
							}
						}
					}
					renderer_cv.render( stage_cv );
				},
				moveControl = e => {
					if( e.type == 'mousedown' || e.type == 'touchstart' ){
						ival = e.currentTarget.value;
						moveTimer = setInterval( () => moveRun( ival ), 50 );
					} else {
						clearInterval( moveTimer );
					}
				};
			addMultiEventListener(
				[ bt.mu, bt.md, bt.ml, bt.mr ],
				[ 'mousedown', 'mouseup', 'touchstart', 'touchend' ],
				moveControl, false
			);
		},

		/* -----------------------------
		// Import, Export
		----------------------------- */
		conv_rle: str => {
			str = str.replace( /#.*?\n/g, '' );
			str = str.replace( /^[^bo\d\$].*?\n/gm, '' ).replace( /[^bo\d\$]/g, '' );
			str = str.replace( /(\d+)(b|o|\$)/g, ( r0, r1, r2 ) => r2.repeat( parseInt( r1, 10 ) ) );
			str = str.replace( /b/g, '0' ).replace( /o/g, '1' );
			str = str.split( '\$' );
			if( str != '' ){
				data = [];
				dataNext = [];
				rate = 0;
				for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
					data[z] = 0;
					dataNext[z] = 0;
					for ( z2 = 32; z2--; ) {
						grid_x = ( z << 5 | 31 ^ z2 ) & 511,
						grid_y = z >>> 4;
						if( str.length > grid_y ){
							if( str[grid_y].length > grid_x ){
								DoA = parseInt( str[grid_y].charAt(grid_x), 10 );
							} else {
								DoA = 0;
							}
						} else {
							DoA = 0;
						}
						data[z] = data[z] | ( DoA << z2 );
						dataNext[z] = dataNext[z] | ( DoA << z2 );
						if( DoA ){
							texs_cv[z][z2].tint = rgb;
							texs_cv[z][z2].alpha = 1;
							rate = plus( rate, 1 );
						} else {
							texs_cv[z][z2].tint = 0x000000;
							texs_cv[z][z2].alpha = 0;
						}
					}
				}
				renderer_cv.render( stage_cv );
				gen = 0;
				func.information( gen, rate );
			}
		},
		modal: () => {
			let
				grid_x, grid_y, dataStr = [], instStr = [],
				str = '', ival;
			const
				lifeExport = () => {
					str = '';
					str += '#N no name\n';
					str += '#C export is gen.=' + gen + ',\n';
					str += 'x = 512, y = 256, rule = B3/S23:T512,256\n';
					for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
						dataStr[z] = ( data[z] >>> 0 ).toString( 2 );
						dataStr[z] = ( '0000000000000000000000000000000' + dataStr[z] ).slice( -32 );
						if( z % 16 == 0 ) {
							instStr[z>>>4] = dataStr[z];
						} else {
							instStr[z>>>4] = instStr[z>>>4] + dataStr[z];
						}
						if( z % 16 == 15 ){
							instStr[z>>>4] = instStr[z>>>4].replace( /0/g, 'b' ).replace( /1/g, 'o' );
							instStr[z>>>4] = instStr[z>>>4].replace( /(bb+|oo+)/g, ( r0, r1 ) => r1.length + r1.charAt( 0 ) );
							instStr[z>>>4] = instStr[z>>>4].replace( /512b/g, '' );
						}
					}
					str += instStr.join( '$' ) + '!';
					str = str.replace( /(\$\$+)/g, ( r0, r1 ) => r1.length + '$' );
					tx_ex.value = str;
					tx_im.value = '';
				},
				lifeImport = () => {
					str = tx_im.value;
					func.conv_rle( str );
				},
				modalControl = e => {
					ival = e.currentTarget.value;
					if( ival == 'import' ){
						modal.style.display = 'flex';
						tx_im.style.display = 'block';
						tx_ex.style.display = 'none';
					} else if( ival == 'export' ){
						lifeExport();
						modal.style.display = 'flex';
						tx_im.style.display = 'none';
						tx_ex.style.display = 'block';
					} else {
						modal.style.display = 'none';
						if( tx_im.value != '' ) lifeImport();
					}
					if( ival != 'close' && bt.pl.value == 'stop' ) bt.pl.click();
				};
			addMultiEventListener(
				[ bt.im, bt.ex, bt.mc ], 'click', modalControl, false
			);
		},

		/* -----------------------------
		// fast backward
		----------------------------- */
		fastBackward: rule => {
			const fastBackwardRun = () => {
				rate = 0;
				for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
					data[z] = 0;
					dataNext[z] = 0;
					for ( z2 = 32; z2--; ) {
						DoA = dataDefault[z] >>> z2 & 1;
						data[z] = data[z] | DoA << z2;
						dataNext[z] = dataNext[z] | DoA << z2;
						if( DoA ){
							texs_cv[z][z2].tint = toRGB( nowColors );
							texs_cv[z][z2].alpha = 1;
							rate = plus( rate, 1 );
						} else {
							texs_cv[z][z2].tint = 0x000000;
							texs_cv[z][z2].alpha = 0;
						}
					}
				}
				renderer_cv.render( stage_cv );
				gen = 0;
				func.information( gen, rate );
			};
			bt.fs.addEventListener( 'click', fastBackwardRun, false );
		},

		/* -----------------------------
		// set list
		----------------------------- */
		setListSet: rule => {
			const setListRun = () => {
				ival = sl_set.options[sl_set.selectedIndex].value;
				if( ival !== 'none' ) func.conv_rle( setList[ival] );
			};
			sl_set.addEventListener( 'change', setListRun, false );
			sl_set.selectedIndex = 0;
		},

		/* -----------------------------
		// Zoom-in/Zoom-out
		----------------------------- */
		zoomSet: () => {
			let wd;
			const zoomRun = e => {
				ival = e.currentTarget.value;
				if( ival == 'zoomout' ){
					wd = 0.3333;
					renderer_cv.resize( 512, 256 );
					for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
						for ( z2 = 32; z2--; ) {
							grid_x = ( z << 5 & 511 | 31 ^ z2 );
							grid_y = ( z >>> 4 );
							texs_cv[z][z2].position.x = grid_x;
							texs_cv[z][z2].position.y = grid_y;
							texs_cv[z][z2].scale.x = wd;
							texs_cv[z][z2].scale.y = wd;
						}
					}
					e.currentTarget.value = 'zoomin';
					life.width = 512;
					life.height = 256;
					life_wrap.style.maxWidth = 512 + 'px';
					life_wrap.style.maxHeight = 256 + 'px';
				} else {
					wd = 1;
					renderer_cv.resize( 2048, 1024 )
					for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
						for ( z2 = 32; z2--; ) {
							grid_x = ( z << 5 & 511 | 31 ^ z2 ) << 2;
							grid_y = ( z >>> 4 ) << 2;
							texs_cv[z][z2].position.x = grid_x;
							texs_cv[z][z2].position.y = grid_y;
							texs_cv[z][z2].scale.x = wd;
							texs_cv[z][z2].scale.y = wd;
						}
					}
					e.currentTarget.value = 'zoomout';
					life.width = 2048;
					life.height = 1024;
					life_wrap.style.maxWidth = 2048 + 'px';
					life_wrap.style.maxHeight = 1024 + 'px';
				}
				renderer_cv.render( stage_cv );
			};
			bt.zm.addEventListener( 'click', zoomRun, false );
		},

		/* -----------------------------
		// Footprint
		----------------------------- */
		footprintSet: () => {
			const footprint = () => {
				for ( z = 0; z < 4096; z = plus( z, 1 ) ) {
					for ( z2 = 32; z2--; ) {
						if( !( data[z] >> z2 & 1 ) ){
							texs_cv[z][z2].tint = 0x666666;
							texs_cv[z][z2].alpha = 1;
						}
					}
				}
				renderer_cv.render( stage_cv );
			};
			bt.ft.addEventListener( 'click', footprint, false );
		},

		/* -----------------------------
		// For test
		----------------------------- */
		test: () => {
			//console.log( 'test' );
		}

	};
	func.init();

	// API
	return false;
	//{test: func.test};
})();