import { sanitizeInput } from "../../utils/sanitize.js";

const sanitizeBody = (req, res, next) => {
	const sanitizeObject = (obj) => {
		for (let key in obj) {
			if (typeof obj[key] === "string") {
				obj[key] = sanitizeInput(obj[key]);
			} else if (typeof obj[key] === "object" && obj[key] !== null) {
				sanitizeObject(obj[key]);
			}
		}
	};

	if (req.body) sanitizeObject(req.body);
	if (req.query) sanitizeObject(req.query);
	if (req.params) sanitizeObject(req.params);

	req.log.debug("sanitizeBody called");

	next();
};

export default sanitizeBody;