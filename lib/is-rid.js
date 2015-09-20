// Simple function to check this is a valid Orintdb rid

module.exports = function checkRid(rid) {
  const split = rid.split(':');

  if(split.length !== 2)
    return false;

  if(isNaN(+split[0]))
    return false;

  if(isNaN(+split[1]))
    return false;

  return true;
}
