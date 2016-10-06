module.exports = function prompt( message, cb ) {

  process.stdin.resume();
  process.stdin.setEncoding('utf8')
  process.stdout.write(message);
  process.stdin.once("data", function (data) {
    if ( cb ) cb( data.toString().trim() )
    process.stdin.pause();
  });

}