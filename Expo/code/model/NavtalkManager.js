class NavtalkManager{
    static instance;
    static getInstance() {
      if (!NavtalkManager.instance) {
        NavtalkManager.instance = new NavtalkManager();
      }
      return NavtalkManager.instance;
    }
    
    
    //1.Params
    //1.1.required
    license = "*********"
    characterName = "*********"
    characterId = "*********"
    
    //1.2.required param from api
    avatar_image_url = ""
    avatar_provider_type = ""

    //2.option
    //2.1.
    isOrNotSaveHistoryChatMessages = false
    //2.2.
    navtalkBaseURL = "wss://transfer.navtalk.ai/wss/v2/realtime-chat"
    //2.3.
    fetchAvatarInfoByName = "https://api.navtalk.ai/api/open/v1/avatar/getByName?name="
    fetchAvatarInfoById = "https://api.navtalk.ai/api/open/v1/avatar/detail?avatarId="

    //3.Function Call:
    functionCallAllParams = [
    {
      type: "function",
      name: "functioncall_add_two_number",
      description: "Perform addition of two numbers. Both parameters are required.",
      parameters: {
        type: "object",
        properties: {
          number1: {
            type: "string",
            description: "The first number to be added. Ask the user if missing."
          },
          number2: {
            type: "string",
            description: "The second number to be added. Ask the user if missing."
          }
        },
        required: ["number1", "number2"]
      }
    },
    {
      type: "function",
      name: "functioncall_close_session",
      description: "Close the current user session",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ]
   
    //Other: off/connecting/on
    navtalk_call_status = "off"

}
//Export class
export default NavtalkManager.getInstance();