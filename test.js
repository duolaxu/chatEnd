let str = "我是你的聊天用户userId_1&我知道我知道userId_1&来来来，你告诉我你知道什么userId_101&";
let arr = str.split("userId_101&");
console.log(arr);
console.log(arr[0].split("userId_1&"));
console.log(arr[1].split("userId_1&"));