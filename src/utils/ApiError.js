class ApiError extends Error{
	
	constructor(statusCode, message, data=null){

		super(message);
		this.statusCode = statusCode;
		this.data = data;
		Error.captureStackTrace(this, this.consturctor);
	}
};

export default ApiError;