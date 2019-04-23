/* This specifies the default attributes of the cirles in edit mode */
const circleDiameter = 7;
const intersectionCircleDiameter = circleDiameter * 1.5;
const intersectionColor = ['green', 'red'];

/* This class defines the polygons to be drawn */
class Polygon {
	constructor() {
		this.vertices = [];
		this.lines = [];
	}

	addVertexPosition(vertex) {
		this.vertices.push(vertex);
		if (this.vertices.length > 1) {
			this.lines.push({
				start: this.vertices[this.vertices.length - 2],
				end: this.vertices[this.vertices.length - 1]
			});
		}
	}

	close() {
		this.vertices.pop();
		this.lines.pop();
		this.lines.push({
			start: this.vertices[this.vertices.length - 1],
			end: this.vertices[0]
		});
	}

	move(movementVector) {
		this.vertices.map(vertexPosition => {
			vertexPosition.x = vertexPosition.x + movementVector.x;
			vertexPosition.y = vertexPosition.y + movementVector.y;
			return vertexPosition;
		})
	}

	/* This method controls the drawnings of polygons */
	draw(isLast, editMode) {
		beginShape();
		stroke(polygonOutlineColor);
		this.vertices.forEach(vertexPosition => {
			vertex(vertexPosition.x, vertexPosition.y);
		});
		if (isLast) {
			vertex(mouseX, mouseY);
		}
		endShape(CLOSE);

		/* This block defines the bullets on edit mode */
		if (editMode) {
			fill(polygonOutlineColor);
			this.vertices.forEach(vertexPosition => {
				circle(vertexPosition.x, vertexPosition.y, circleDiameter);
			});
			/* This second fill is needed for polygons redrawn */
			fill(fillColor);
		}
	}
}

/* This class defines the rays to be drawn */
class Ray {
	constructor(x, y) {
		this.start = createVector(x, y);
		this.radius = 30;
		this.end = null;
		this.direction = null;
	}

	target(x, y) {
		this.direction = p5.Vector.sub(
			createVector(x, y), this.start
			).normalize().mult(40);
		this.end = p5.Vector.add(this.start, this.direction)
	}

	/* Define the new position of the vector when in edit mode */
	move(x, y) {
		this.start = createVector(x, y);
		this.end = p5.Vector.add(this.start, this.direction)
	}

	intersect(polygon) {
		let intersections = []
		polygon.lines.forEach(l => {
			let intersection = findIntersection(this, l);
			if (intersection && this.checkDirection(intersection)) {
				intersections.push(intersection)
			}
		})
		intersections.sort((a, b) => {
			let distToA = dist(this.start.x, this.start.y, a.x, a.y)
			let distToB = dist(this.start.x, this.start.y, b.x, b.y)
			return distToA - distToB
		})
		return intersections
	}

	/* Draw arrow of the ray using normalized functions */
	drawArrow(base, vector) {
		push();
		translate(base.x, base.y);
		stroke(polygonOutlineColor);
		strokeWeight(2);
		line(0, 0, vector.x, vector.y);
		rotate(vector.heading());
		let arrowSize = 7;
		translate(vector.mag() - arrowSize, 0);
		triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
		pop();
	}

	/* This control the drawning of the rays */
	draw(showIntersectionPoints) {
		/* WORKAROUND: This ignores the drawning when the ray is 0,0.
		 * It does not really solves the issue since the broken ray will be in
		 * in the memory, it will not be displayed
		 */
		if (this.direction && this.direction.mag() === 0) {
			return;
		}

		stroke(rayColor); /* Color of the ray */
		fill(backgroundColor); /* This changes the internal color of bullets on arrows */
		circle(this.start.x, this.start.y, circleDiameter);

		if (!this.direction) {
			this.target(mouseX, mouseY);
			var clearTarget = true;
		}

		/* Draw the arrow */
		this.drawArrow(this.start, this.direction);
		
		/* Draw the ray up to the virtual box */
		var rayEnd = this.infinity()
		if (rayEnd) {
			/* To draw dotted lines we need to set Line Dash, but it needed to
			 * be reset after the drawning or else the polygons would be dotted
			 */
			drawingContext.setLineDash([3, 3]);
			line(...rayEnd);
			drawingContext.setLineDash([]);
		}

		if (showIntersectionPoints) {
			polygons.forEach(s => {
				if (s.vertices.length > 0) {
					let intersections = this.intersect(s);
					let indexColor = 0;
					intersections.forEach(i => {
						fill(intersectionColor[indexColor++ % 2]);
						circle(i.x, i.y, intersectionCircleDiameter);
					})
				}
			})
		}
		
		fill(fillColor);

		if (clearTarget) {
			this.end = null;
			this.direction = null;
		}
	}

	/* This method points the ray to the virtual box around the canvas, it's
	 * named infinity since it gives the false sensation that the ray go to
	 * infinity
	 */
	infinity() {
		for (let boxLimit of boxLimits) {
			var intersection = findIntersection(this, boxLimit);
			if (intersection) {
				var lineExtension = this.checkDirection(intersection);
				if (lineExtension) { 
					return lineExtension;
				}
			}
		} 
		return false;
	}

	checkDirection(intersection) {
		var intersectionVector = p5.Vector.sub(
			createVector(intersection.x, intersection.y), this.start
		);

		/* What? */
		if (((intersectionVector.x >= 0) == (this.direction.x >= 0)) &&
		   ((intersectionVector.y >= 0) == (this.direction.y >= 0))) {
			return [this.end.x, this.end.y, intersection.x, intersection.y]
		} 
		return false;
	}
}
