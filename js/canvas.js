/* Standard color definitions */
const backgroundColor = 0;
const polygonOutlineColor = 'white';
const rayColor = 'yellow';
var fillColor;

/* Polygons */
var polygons, polygonIndex;

/* Rays */
var rays, rayIndex;

/* Radio Selectors */
const radioSelections = [
	'Draw Polygon',
	'Draw Ray',
	'Edit Mode'
];
var radio, mode;

/* Intersections switch */
var intersectionPointsSwitch, showIntersectionPoints;

/* Those globals controls the virtual box that limits the "infinity rays" */
var boxLimits, boxEdgePositions;

/* Variables for editing the polygons and rays */
var editVertex, editRayPosition, editRayDirection, editPolygon;
var lastFrameCount, ppmouseX, ppmouseY;

/* Enable support for resizing of the broser window */
function windowResized() {
	resizeCanvas(window.innerWidth, window.innerHeight);

	/* bordesLines must be reset when the screen is resized or else the rays
	 * would end at the first window size
	 */
	boxLimits = [];
}

function setup() {
	/* The canvas will have the size of the inner window */
	let canvas = createCanvas(window.innerWidth, window.innerHeight);

	/* This is the <div> name of the canvas; including the setup of callbacks
	 * and clock handling
	 */
	canvas.parent('canvas');
	canvas.mousePressed(click);
	canvas.doubleClicked(doubleClick);

	/* This is the radio select on the top, copied from the example:
	 * https://p5js.org/reference/#/p5/createRadio
	 */
	radio = createRadio();
	radio.parent('buttons');
	radioSelections.forEach(option => {
		radio.option(option);
	});

	radio.changed(function() {
		mode = radio.value();
	});

	/* Select the first option as default on the radio menu */
	mode = radioSelections[0];
	document.querySelector(`input[value="${radioSelections[0]}"]`).checked = true;
	
	/* Controls the drawinig of intersection points within rays and polygons */
	showIntersectionPoints = false;
	intersectionPointsSwitch = createButton('Enable Intersections');
	intersectionPointsSwitch.parent('buttons');
	intersectionPointsSwitch.mousePressed(function() {
		if (intersectionPointsSwitch.elt.textContent == 'Enable Intersections') {
			intersectionPointsSwitch.elt.textContent = 'Disable Intersections';
			showIntersectionPoints = true;
		} else {
			intersectionPointsSwitch.elt.textContent = 'Enable Intersections';
			showIntersectionPoints = false;
		}
	});

	/* Initialize data structures */
	polygons = [new Polygon()];
	polygonIndex = 0;
	rays = [];
	rayIndex = 0;
	boxLimits = [];
	boxEdgePositions = [];
}

function draw() {
	/* Set the color background and refresh; this should be here instead of the
	 * setup() function because the window must be redraw everytime during the
	 * cursor free mode. If the background isn't always redrawn a trail of the
	 * drawning will be always on the screen
	 */
	background(backgroundColor);

	/* Set text colors */
	fillColor = color('#AAAAFF'); /* Some baby blue */
	fill(fillColor);
	stroke(fillColor);

	/* Write on the canvas the badly written instructions */
	let string = "Use radio buttons to change modes";
	textSize(14);
	text(string, 5, window.innerHeight - 36);

	/* Set drawning default colors */
	fillColor = color('blue');
	/* Set the alpha level accordingly to the number of nested polygons */
	let nestedPolygons = 3;
	fillColor.setAlpha(255 / nestedPolygons);
	fill(fillColor);

	/* This specifies a virtual box to limit the rays, only needed for rays */
	boxEdgePositions = [
		{x: 0, y: 0},
		{x: 0, y: window.innerHeight},
		{x: window.innerWidth, y: 0},
		{x: window.innerWidth, y: window.innerHeight}
	];

	for (let start of boxEdgePositions) {
		for (let end of boxEdgePositions) {
			let boxLimit = {start, end}
			if (start != end && 
				boxLimits.indexOf(boxLimit) == -1 &&
				start.x == end.x || start.y == end.y) {
					boxLimits.push({start, end})
			}
		}
	}

	/* (re)draw polygons on the screen */
	for (let i = 0; i < polygons.length; i++) {
		let polygon = polygons[i];
		let isLast = ((i == polygonIndex) && (mode == radioSelections[0]));
		polygon.draw(isLast, (mode == radioSelections[2]));
	}

	/* (re)draw rays on the scrren */
	rays.forEach(ray => {
		ray.draw(showIntersectionPoints);
	});

}

function click() {
	switch (mode) {

		/* Draw polygon mode */
		case radioSelections[0]:
			polygons[polygonIndex].addVertexPosition({
				x: mouseX, 
				y: mouseY 
			});
		break;
		
		/* Draw ray mode */
		case radioSelections[1]:
			rays.push(new Ray(mouseX, mouseY)); 
		break;

		/* Edit mode */
		case radioSelections[2]:
			editVertex = null;
			editRayDirection = null;
			editRayPosition = null;
			editPolygon = null;
			let found = false;
			let threshold = 10;
			/* Try to find vertices close to mouseClick */
			let polygonPoints = polygons.flatMap(
				(polygon) => polygon.vertices.map(
					(vertexPosition) => {
						return {
							vertex: vertexPosition,
							distance: dist(mouseX, mouseY, 
								           vertexPosition.x, vertexPosition.y)
						}
					}
				)
			)

			if (polygonPoints.length > 0) {
				var closestPoint = polygonPoints.reduce((p, c) => p.distance < c.distance ? p : c);
			}

			if (polygonPoints.length > 0 && closestPoint.distance < threshold) {
				editVertex = closestPoint.vertex;
				found = true;
			} else {
				/* Try to get rays close to mouseClick with a given threshold */
				for (let i = 0; i < rays.length; i++) {
					const ray = rays[i];
					let endDistance = dist(mouseX, mouseY, ray.end.x, ray.end.y)
					let startDistance = dist(mouseX, mouseY, ray.start.x, ray.start.y)
					if (startDistance < threshold) {
						editRayPosition = rays[i];
						found = true;
					}
					if (!found && endDistance < threshold) {
						editRayDirection = rays[i]
						found = true;
					}
				}
			}
			
			/* Check if the click was inside the polygon */
			if (!editVertex && !editRayDirection && !editRayPosition) {
				var clickRay = new Ray(mouseX, mouseY);
				for (let s of polygons) {
					if (s.vertices.length > 0) {
						for (let l of s.lines) {
							let {x, y} = getMiddlePointPosition(l)
							clickRay.target(x, y)
							let intersections = clickRay.intersect(s)
							if (intersections.length % 2 == 1) {
								editPolygon = s;
							break;
							}
						}
						if (editPolygon) break;
					}
				}
			}
		break;
	}
}

function mouseDragged() {
	if (mode == radioSelections[2]) {
		if (editVertex) {
			editVertex.x = mouseX;
			editVertex.y = mouseY;
		} else if (editRayDirection) {
			editRayDirection.target(mouseX, mouseY);
		} else if (editRayPosition) {
			editRayPosition.move(mouseX, mouseY);
		} else if (editPolygon && frameCount != lastFrameCount) {
			lastFrameCount = frameCount;
			if (ppmouseX && ppmouseY) {
				let movementVector = p5.Vector.sub(
					createVector(pmouseX, pmouseY),
					createVector(ppmouseX, ppmouseY)
				);
				editPolygon.move(movementVector);
			}
			ppmouseX = pmouseX;
			ppmouseY = pmouseY;
		}
	}
}

function mouseReleased() {
	if (mode == radioSelections[1] && rays[rayIndex]) {
		rays[rayIndex].target(mouseX, mouseY);
		rayIndex++;
	}
	ppmouseX = null;
	ppmouseY = null;
}

function doubleClick() {
	polygons[polygonIndex].close();
	polygons.push(new Polygon());
	polygonIndex++;
}

function getMiddlePointPosition(line) {
	return {
		x: (line.start.x + line.end.x)/2,
		y: (line.start.x + line.end.y)/2
	};
}

/* Completely based on code from:
 * http://www.realtimerendering.com/resources/GraphicsGems/gemsii/xlines.c
 */
function findIntersection(line1, line2) {
	const {start: lineStart1, end: lineEnd1} = line1;
	const {x: x1, y: y1} = lineStart1;
	const {x: x2, y: y2} = lineEnd1;
	const {start: lineStart2, end: lineEnd2} = line2;
	const {x: x3, y: y3} = lineStart2;
	const {x: x4, y: y4} = lineEnd2;
	let x, y;
	
	let a1, a2, b1, b2, c1, c2; /* Coefficients of line eqns. */
	let r1, r2, r3, r4;         /* 'Sign' values */
	let denom, offset, num;     /* Intermediate values */
	
	/* Compute a1, b1, c1, where line joining points 1 and 2
	 * is "a1 x	+	b1 y	+	c1	=	0".
	 */
	a1 = y2 - y1;
	b1 = x1 - x2;
	c1 = x2 * y1 - x1 * y2;
	
	// Compute r3 and r4.
	r3 = a1 * x3 + b1 * y3 + c1;
	r4 = a1 * x4 + b1 * y4 + c1;
	
	/* Check signs of r3 and r4.	If both point 3 and point 4 lie on
	 * same side of line 1, the line segments do not intersect.
	 */
	if (r3 != 0 && r4 != 0 && ((r3 >= 0) == (r4 >= 0))) {
		return false;
	}
	
	/* Compute a2, b2, c2 */
	a2 = y4 - y3;
	b2 = x3 - x4;
	c2 = x4 * y3 - x3 * y4;
	
	/* Compute r1 and r2 */
	r1 = a2 * x1 + b2 * y1 + c2;
	r2 = a2 * x2 + b2 * y2 + c2;
	
	/* Line segments intersect: compute intersection point. */
	denom = a1 * b2 - a2 * b1;
	if ( denom == 0 ) { 
		return false; /* Collinear */
	}
	offset = denom < 0 ? - denom / 2 : denom / 2;
	
	/* The denom/2 is to get rounding instead of truncating.	It
	 * is added or subtracted to the numerator, depending upon the
	 * sign of the numerator.
	 */
	num = b1 * c2 - b2 * c1;
	x = ( num < 0 ? num - offset : num + offset ) / denom;
	
	num = a2 * c1 - a1 * c2;
	y = ( num < 0 ? num - offset : num + offset ) / denom;
	
	return {x, y};
}

/* MARKED FOR REMOVAL:
 * This function was to draw the dashed lines of rays but it rendered useless
 * after the discovery of the setDashLine on the rendering context.
 * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setLineDash
 */
function dashedLine(x1, y1, x2, y2, l, g) {
	let pc = dist(x1, y1, x2, y2) / 100;
	let pcCount = 1;
	let lPercent = gPercent = 0;
	let currentPos = 0;
	let xx1 = yy1 = xx2 = yy2 = 0;
 
	while (int(pcCount * pc) < l) {
		pcCount++;
	}
	lPercent = pcCount;
	pcCount = 1;

	while (int(pcCount * pc) < g) {
		pcCount++;
	}
	gPercent = pcCount;
 
	lPercent = lPercent / 100;
	gPercent = gPercent / 100;
	
	while (currentPos < 1) {
		xx1 = lerp(x1, x2, currentPos);
		yy1 = lerp(y1, y2, currentPos);
		xx2 = lerp(x1, x2, currentPos + lPercent);
		yy2 = lerp(y1, y2, currentPos + lPercent);

		if (x1 > x2) {
			if (xx2 < x2) {
				xx2 = x2;
			}
		}

		if (x1 < x2) {
			if (xx2 > x2) {
				xx2 = x2;
			}
		}

		if (y1 > y2) {
			if (yy2 < y2) {
				yy2 = y2;
			}
		}

		if (y1 < y2) {
			if (yy2 > y2) {
				yy2 = y2;
			}
		}
 
		line(xx1, yy1, xx2, yy2);
		currentPos = currentPos + lPercent + gPercent;
	}
}
