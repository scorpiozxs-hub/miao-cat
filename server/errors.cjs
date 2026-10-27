class GameError extends Error {
  constructor(code,message,retryable=false){super(message);this.code=code;this.retryable=retryable;}
}
const check=(condition,code,message,retryable=false)=>{if(!condition)throw new GameError(code,message,retryable);};
module.exports={GameError,check};
