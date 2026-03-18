import sanitizeHtml from "sanitize-html";

export const sanitizeInput = (input) => {
	if (typeof input !== "string") return input;

	return sanitizeHtml(input, {
		allowedTags: [], // remove all HTML
		allowedAttributes: {}
	});
};