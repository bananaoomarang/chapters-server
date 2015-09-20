// Change Orient rid -> id

module.exports = function processId (record) {
  const rid = record['@rid'];
  
  record.id = [rid.cluster, rid.position].join(':');
  delete record['@rid'];

  return record;
};
