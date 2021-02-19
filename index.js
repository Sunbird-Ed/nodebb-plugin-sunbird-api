var Plugin = (module.exports = {})
const axios = require('axios')
const Categories = require.main.require('./src/categories')
const posts = require.main.require('./src/posts')
const Topics = require.main.require('./src/topics')
const Users = require.main.require('./src/user')
const Groups = require.main.require('./src/groups')
const db = require.main.require('./src/database')
const async = require('async')
const apiMiddleware = require('./middleware')
const responseMessage = require('./responseHandler')
const createTenantURL = '/api/org/v1/setup'
const createForumURL = '/api/forum/v1/create'
const createSectionURL = '/api/org/v1/sections/add'
const getForumURL = '/api/forum/v1/read'
const categoryList = '/api/category/list';
const requestPromise = require('request-promise');
const tagsList = '/api/tags/list'
const utils = require('./utils')
const allTopicsByCategoryURL = '/api/category/v1/topic'
const allPostsByTopicURL = '/api/topic/v1/posts'
const replyTopicURL = '/api/topic/v1/reply'
const createTopicURL = '/api/topic/v1/create'
const voteURL = '/api/:pid/vote'
const deletePostURL = '/api/post/v1/delete/:pid'
const deleteTopicURL = '/api/topic/v1/delete/:tid'
const purgePostURL = '/api/post/v1/purge/:pid'
const purgeTopicURL = '/api/topic/v1/purge/:tid'
const banUserURL = '/api/user/v1/ban'
const unbanUserURL = '/api/user/v1/unban'
const createCatwithSubcatURL = '/api/create'
const createSBForum= '/api/forum/v2/create';
const getSBForum= '/api/forum/v2/read';
const removeSBForum = '/api/forum/v2/remove';
const createRelatedDiscussions = '/api/forum/v3/create';
const waterfall = require('async-waterfall');
const privileges = require.main.require('./src/privileges');
const copyPrivilages = '/api/privileges/v2/copy'

const configData = require.main.require('./config.json')
const mongoose = require('mongoose');
const { Schema } = mongoose;
const forumSchema = new Schema({ 
    sbType: String,
    cid: Number,
    sbIdentifier: String 
  });
  
const mongodbConnectionUrl =  `mongodb://${configData.mongo.host}:${configData.mongo.port}/${configData.mongo.database}`;
mongoose.connect(mongodbConnectionUrl);
const sbCategoryModel = mongoose.model('sbcategory', forumSchema);
console.log('SB config Json: ', configData);
console.log('SB Mongo URL: ', mongodbConnectionUrl)
const {
  createCategory,
  createCategory_check,
  createGroupDefault,
  addPrivileges,
  addSection,
  createForum,
  createGroup,
  getForum,
  createTopic,
  replyTopic
} = require('./library')

const { default: Axios } = require('axios')

var constants = {
  'key': 'list',
  'errorResCode': 'SERVER_ERROR',
  'resCode': 'OK',
  'statusFailed': 'failed',
  'http_protocal': 'http',
  'statusSuccess': 'Success',
  '/api/category/list': 'api.discussions.category.list',
  'api/tags/list': 'api.discussion.tags.list',
  '/api/forum/v3/create': 'api.forum.v3.create',
  'createCategory': '/v2/categories',
  'createForum': '/forum/v2/create',
  'getForum': '/forum/v2/read',
  'createPrivileges': '/v2/categories/:cid/privileges',
  '/api/privileges/v2/copy': 'api.privileges.v2.copy',
  'enablePrivileges': '/v2/categories/:cid/privileges',
  'defaultCategory': 'General Discussion',
  'post': 'POST',
  'get': 'GET',
  'put': 'PUT',
  'apiPrefix': '/api',
}

async function createTopicAPI (req, res) {
  var payload = { ...req.body.request }
  console.log('-----------payload ---------------', payload)
  payload.tags = payload.tags || []
  payload.uid = payload._uid ? payload._uid : req.user.uid

  return createTopic(payload)
    .then(topicObj => {
      let resObj = {
        id: 'api.discussions.topic.create',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: topicObj
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      console.log('--------------error 00000000', error)
      let resObj = {
        id: 'api.discussions.topic.create',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function allTopicsByCategory (req, res) {
  var payload = { ...req.body.request }

  axios
    .get(`http://localhost:4567/api/category/${payload.cid}`)
    .then(topicObj => {
      let resObj = {
        id: 'api.discussions.topic.all',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: topicObj.data
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      console.log(error)
      let resObj = {
        id: 'api.discussions.topic.all',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function allPostsByTopic (req, res) {
  var payload = { ...req.body.request }
  console.log('--------------------', payload)
  axios
    .get(`http://localhost:4567/api/topic/${payload.tid}`)
    .then(postObj => {
      // console.log('--------------------',postObj)
      let resObj = {
        id: 'api.discussions.reply.all',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: postObj.data
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.reply.all',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function replyTopicAPI (req, res) {
  let { body } = req

  var payload = {
    tid: body.request.tid,
    uid: req.user.uid,
    req: utils.buildReqObject(req), // For IP recording
    content: body.request.content,
    timestamp: body.request.timestamp || Date.now()
  }

  if (req.body.toPid) {
    payload.toPid = body.request.toPid
  }

  return replyTopic(payload)
    .then(topicObj => {
      let resObj = {
        id: 'api.discussions.topic.reply',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: topicObj
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.topic.reply',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    })
}

async function deletePostAPI (req, res) {
  let { body } = req
  posts.delete(req.params.pid, req.user.uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.delete.post',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.delete.post',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function deleteTopicAPI (req, res) {
  Topics.delete(req.params.tid, req.params._uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.delete.topic',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.delete.topic',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function purgeTopicAPI (req, res) {
  Topics.purgePostsAndTopic(req.params.tid, req.params._uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.purge.topic',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.purge.topic',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function purgePostAPI (req, res) {
  posts.purge(req.params.pid, req.user.uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.purge.post',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.purge.post',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function voteURLAPI (req, res) {
  let { body } = req

  if (body.request.delta > 0) {
    posts.upvote(req.params.pid, req.user.uid, function (error, data) {
      if (error) {
        let resObj = {
          id: 'api.discussions.post.vote',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.post.vote',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: data
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
  } else if (body.request.delta < 0) {
    posts.downvote(req.params.pid, req.user.uid, function (error, data) {
      if (error) {
        let resObj = {
          id: 'api.discussions.post.vote',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.post.vote',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: data
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
  } else {
    posts.unvote(req.params.pid, req.user.uid, function (error, data) {
      if (error) {
        let resObj = {
          id: 'api.discussions.post.vote',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.post.vote',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: data
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    })
  }
}

async function banUserAPI (req, res) {
  let { body } = req

  Users.bans.ban(
    body.request.uid,
    body.request.until || 0,
    body.request.reason || '',
    function (error) {
      if (error) {
        let resObj = {
          id: 'api.discussions.user.ban',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.status(400).json(responseMessage.errorResponse(resObj))
      }
      let resObj = {
        id: 'api.discussions.user.ban',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: null
      }
      return res.status(200).json(responseMessage.successResponse(resObj))
    }
  )
}

async function unbanUserAPI (req, res) {
  let { body } = req

  Users.bans.unban(body.request.uid, function (error) {
    if (error) {
      let resObj = {
        id: 'api.discussions.user.ban',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.status(400).json(responseMessage.errorResponse(resObj))
    }
    let resObj = {
      id: 'api.discussions.user.ban',
      msgId: req.body.params.msgid,
      status: 'successful',
      resCode: 'OK',
      data: null
    }
    return res.status(200).json(responseMessage.successResponse(resObj))
  })
}

async function setupOrgAPI (req, res) {
  let { body } = req
  var reqPrivileges = body.request.privileges
  return createCategory(body.request)
    .then(catResponse => {
      if (catResponse) {
        let allCatIds = []
        catResponse.sectionObj.map(section => {
          allCatIds.push(section.cid)
        })
        allCatIds.push(catResponse.categoryObj.cid)
        return addPrivileges(reqPrivileges, allCatIds)
          .then(privilegesResponse => {
            let resObj = {
              id: 'api.discussions.org.setup',
              msgId: req.body.params.msgid,
              status: 'successful',
              resCode: 'OK',
              data: catResponse
            }
            return res.json(responseMessage.successResponse(resObj))
          })
          .catch(error => {
            let resObj = {
              id: 'api.discussions.org.setup',
              msgId: req.body.params.msgid,
              status: 'failed',
              resCode: 'SERVER_ERROR',
              err: error.status,
              errmsg: error.message
            }
            return res.json(responseMessage.errorResponse(resObj))
          })
      }
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.org.setup',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function addSectionURL (req, res) {
  let { body } = req
  var reqPrivileges = body.request.privileges
  return addSection(body.request)
    .then(catResponse => {
      let allCatIds = []
      catResponse.sectionObj.map(section => {
        allCatIds.push(section.cid)
      })
      return addPrivileges(reqPrivileges, allCatIds)
        .then(privilegesResponse => {
          let resObj = {
            id: 'api.discussions.org.section.add',
            msgId: req.body.params.msgid,
            status: 'successful',
            resCode: 'OK',
            data: catResponse
          }
          return res.json(responseMessage.successResponse(resObj))
        })
        .catch(error => {
          let resObj = {
            id: 'api.discussions.org.section.add',
            msgId: req.body.params.msgid,
            status: 'failed',
            resCode: 'SERVER_ERROR',
            err: error.status,
            errmsg: error.message
          }
          return res.json(responseMessage.errorResponse(resObj))
        })
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.org.section.add',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function createForumAPI (req, res) {
  let { body } = req
  var reqPrivileges = body.request.privileges

  if (!body.request.organisationId && !body.request.context) {
    let resObj = {
      id: 'api.discussions.forum.create',
      msgId: req.body.params.msgid,
      status: 'failed',
      resCode: 'SERVER_ERROR',
      err: 401,
      errmsg: 'Please provide orgId or context! something is missing'
    }
    return res.json(responseMessage.errorResponse(resObj))
  } else {
    return createForum(body.request)
      .then(catResponse => {
        let allCatIds = []
        allCatIds.push(catResponse.cid)
        if (body.request.groups && body.request.privileges) {
          return createGroup(body.request, allCatIds)
            .then(groupObj => {
              return addPrivileges(reqPrivileges, allCatIds)
                .then(privilegesResponse => {
                  let resObj = {
                    id: 'api.discussions.forum.create',
                    msgId: req.body.params.msgid,
                    status: 'successful',
                    resCode: 'OK',
                    data: catResponse
                  }
                  return res.json(responseMessage.successResponse(resObj))
                })
                .catch(error => {
                  let resObj = {
                    id: 'api.discussions.forum.create',
                    msgId: req.body.params.msgid,
                    status: 'failed',
                    resCode: 'SERVER_ERROR',
                    err: error.status,
                    errmsg: error.message
                  }
                  return res.json(responseMessage.errorResponse(resObj))
                })
            })
            .catch(error => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'failed',
                resCode: 'SERVER_ERROR',
                err: error.status,
                errmsg: error.message
              }
              return res.json(responseMessage.errorResponse(resObj))
            })
        } else if (body.request.groups && !body.request.privileges) {
          return createGroup(body.request, allCatIds)
            .then(groupObj => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'successful',
                resCode: 'OK',
                data: catResponse
              }
              return res.json(responseMessage.successResponse(resObj))
            })
            .catch(error => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'failed',
                resCode: 'SERVER_ERROR',
                err: error.status,
                errmsg: error.message
              }
              return res.json(responseMessage.errorResponse(resObj))
            })
        } else if (!body.request.groups && body.request.privileges) {
          return addPrivileges(reqPrivileges, allCatIds)
            .then(privilegesResponse => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'successful',
                resCode: 'OK',
                data: catResponse
              }
              return res.json(responseMessage.successResponse(resObj))
            })
            .catch(error => {
              let resObj = {
                id: 'api.discussions.forum.create',
                msgId: req.body.params.msgid,
                status: 'failed',
                resCode: 'SERVER_ERROR',
                err: error.status,
                errmsg: error.message
              }
              return res.json(responseMessage.errorResponse(resObj))
            })
        } else {
          let resObj = {
            id: 'api.discussions.forum.create',
            msgId: req.body.params.msgid,
            status: 'successful',
            resCode: 'OK',
            data: catResponse
          }
          return res.json(responseMessage.successResponse(resObj))
        }
      })
      .catch(error => {
        let resObj = {
          id: 'api.discussions.forum.create',
          msgId: req.body.params.msgid,
          status: 'failed',
          resCode: 'SERVER_ERROR',
          err: error.status,
          errmsg: error.message
        }
        return res.json(responseMessage.errorResponse(resObj))
      })
  }
}

async function getForumAPI (req, res) {
  let { body } = req
  return getForum(body.request)
    .then(forumResponse => {
      let resObj = {
        id: 'api.discussions.forum.read',
        msgId: req.body.params.msgid,
        status: 'successful',
        resCode: 'OK',
        data: forumResponse
      }
      return res.json(responseMessage.successResponse(resObj))
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.forum.read',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }

      return res.json(responseMessage.errorResponse(resObj))
    })
}

async function createCatwithSubcat (req, res) {
  let { body } = req
  return createCategory_check(body.request)
    .then(catResponse => {
      if (catResponse) {
        let allCatIds = []
        catResponse.sectionObj.map(section => {
          allCatIds.push(section.cid)
        })
        allCatIds.push(catResponse.categoryObj.cid)

        return createGroupDefault(body.request, req.user.uid, allCatIds)
          .then(groupObj => {
            let resObj = {
              id: 'api.discussions.forum.create',
              msgId: req.body.params.msgid,
              status: 'successful',
              resCode: 'OK',
              data: catResponse
            }
            return res.json(responseMessage.successResponse(resObj))
          })
          .catch(error => {
            let resObj = {
              id: 'api.discussions.forum.create',
              msgId: req.body.params.msgid,
              status: 'failed',
              resCode: 'SERVER_ERROR',
              err: error.status,
              errmsg: error.message
            }
            return res.json(responseMessage.errorResponse(resObj))
          })

        // let resObj = {
        //   id: 'api.discussions.org.setup',
        //   msgId: req.body.params.msgid,
        //   status: 'successful',
        //   resCode: 'OK',
        //   data: catResponse
        // }
        // return res.json(responseMessage.successResponse(resObj))
      }
    })
    .catch(error => {
      let resObj = {
        id: 'api.discussions.org.setup',
        msgId: req.body.params.msgid,
        status: 'failed',
        resCode: 'SERVER_ERROR',
        err: error.status,
        errmsg: error.message
      }
      return res.json(responseMessage.errorResponse(resObj))
    })
}

function commonObject (res, id, msgId, status, resCode, err, errmsg, data) {
  let resObj = null
  if (res === 0) {
    resObj = {
      id: id,
      msgId: msgId,
      status: status,
      resCode: resCode,
      err: err,
      errmsg: errmsg
    }
  } else {
    resObj = {
      id: id,
      msgId: msgId,
      status: status,
      resCode: resCode,
      data: data
    }
  }
  return resObj
}

/**
 * this function will store the forum object in the mapping table.
 * @param {*} req 
 * the request object having sbType, sbIdentifier, cid in the body.
 * @param {*} res 
 */
function createSBForumFunc (req, res) {
  console.log("SB Forum Create Log: request payload=", req.body);
  const payload = { ...req.body.request };
  let resObj = {
    id: 'api.discussions.category.forum',
    status: 'successful',
    resCode: 'OK',
    data: null
  } 
  const SbObj = new sbCategoryModel(payload);
  if( payload ) {
  console.log("Creating the forum");
  SbObj.save().then(data => {
    console.log("forum created");
    resObj.data = data;
    res.send(responseMessage.successResponse(resObj))
  }).catch(error => {
    console.log("Error while Creating the forum");
    resObj.status = 'failed';
    resObj.resCode = 'SERVER_ERROR';
    resObj.err = error.status;
    resObj.errmsg = error.message;
    res.send(responseMessage.errorResponse(resObj));
  });
  }
}

/**
 * This function return the category id's based on the id and type.
 * @param {*} req 
 * @param {*} res 
 */
function getSBForumFunc (req, res) {
  console.log("SB Forum Get Log: request payload", req.body);
  const payload =  { ...req.body.request };
  const id = payload.identifier;
  const type = payload.type;
  let resObj = {
    id: 'api.discussions.category.forum',
    status: 'successful',
    resCode: 'OK',
    data: null
  } 
  
  if( id && type ) {
    console.log('Get forumId');
    sbCategoryModel.find({sbIdentifier: id, sbType: type}).then(data => {
    console.log('SB Forum Get Log: db operation success=>', data);
    resObj.data = data;
    res.send(responseMessage.successResponse(resObj))
  }).catch(error => {
    console.log('Error while getting the forumId');
    resObj.status = 'failed';
    resObj.resCode = 'SERVER_ERROR';
    resObj.err = error.status;
    resObj.errmsg = error.message;
    res.send(responseMessage.errorResponse(resObj));
  });
  }
}

/**
 * This function will remove the  the category ids based on the sb_id and sb_type.
 * @param {*} req 
 * @param {*} res 
 */
function removeSBForumFunc (req, res) {
  console.log(" removing category: payload: ", req.body);
  const payload = { ...req.body.request };
  let resObj = {
    id: 'api.discussions.category.forum',
    status: 'successful',
    resCode: 'OK',
    data: null
  }
  if( payload ) {
  console.log("Removing the category id ");
  sbCategoryModel.deleteOne(payload).then(data => {
    if (data.deletedCount > 0) {
      console.log("category deleted");
      res.send(responseMessage.successResponse(resObj))
    } else {
      console.log("failed to delete category");
      resObj.status = "failed"
      resObj.resCode = 'SERVER_ERROR';
      resObj.errmsg = "Invalid input parameter | Data does not exist";
      resObj.err = "404"
      res.send(responseMessage.errorResponse(resObj));
    }
  }).catch(error => {
    console.log("Error while removing the category");
    resObj.status = 'failed';
    resObj.resCode = 'SERVER_ERROR';
    resObj.err = error.status;
    resObj.errmsg = error.message;
    res.send(responseMessage.errorResponse(resObj));
  });
  }
}

async function getListOfCategories(req, res) {
  const payload = { ...req.body.request };
  if(payload) {
    console.log('req url', );
  const cids = payload.cids;
  const path = req.originalUrl.replace(constants.key, '');
  const url = `${req.protocol}://${req.get('host')}${path}`;
  let allCategories = [];
  let resObj = {
    id: constants[categoryList],
    status: constants.statusSuccess,
    resCode: constants.resCode,
    data: null
  }
  for(let i = 0; i < cids.length; i++) {
    const options = {
      uri: url+cids[i],
      method: 'GET',
      json: true
    };
    console.log(options);
      try {
        const data = await requestPromise(options);
          allCategories.push(data);
          if (i === (cids.length -1)) {
            resObj.data = allCategories;
            res.send(responseMessage.successResponse(resObj));
          }
      } catch(error) {
        console.log({message: `Error while call the api ${options.url}`})
        console.log({message: `Error message:  ${error.message}`})
        res.statusCode = 404;
        resObj.status = constants.failed;
        resObj.resCode = constants.errorResCode;
        resObj.err = error.status;
        resObj.errmsg = `cid ${cids[i]} - ${error.message}`;
        res.send(responseMessage.errorResponse(resObj));
      }
    }
  }
}

async function getTagsRelatedTopics(req,res) {
  const payload = { ...req.body.request };
  let resObj = {
    id: constants[tagsList],
    status: constants.statusSuccess,
    resCode: constants.resCode,
    data: null
  }
  if (payload) {
    const tag = payload.tag;
    const cid = payload.cid;
    const path = req.originalUrl.replace(constants.key, '');
    const url = `${req.protocol}://${req.get('host')}${path}${tag}`;
    const options = {
      uri: url,
      method: 'GET',
      json: true
    };
    try {
      const data = await requestPromise(options);
      const releatedTopics = data.topics.filter(topic => cid.includes(topic.cid));
      resObj.data = releatedTopics;
      res.send(responseMessage.successResponse(resObj));
    } catch(error) {
      console.log({message: `Error while call the api ${options.url}`})
      console.log({message: `Error message:  ${error.message}`})
      res.statusCode = 404;
      resObj.status = constants.failed;
      resObj.resCode = constants.errorResCode;
      resObj.err = error.status;
      resObj.errmsg = error.message;
      res.send(responseMessage.errorResponse(resObj));
    }
  }
}

async function relatedDiscussions (req, res) {
    const payload = { ...req.body.category };
    if (payload) {
      console.log('Creating new category')
      const body = {
        parentCid: payload.pid,
        name: payload.name || constants.defaultCategory
      }
      const categoryUrl = `${constants.createCategory}?_uid=${payload.uid}`
      const cdata = await getResponseData(req, categoryUrl, createRelatedDiscussions, body, constants.post);
      if(cdata && cdata.payload) {
        console.log('category created successfully and category id is', cdata.payload.cid)
        const context = payload.context;
        if(context && context.length > 0) {
          let forumIds = [];
          for(let i=0; i < context.length; i++) {
            // check if mapping category is already exists 
            let forumData = {};
            const reqObj = {
              request: {
                type: context[i].type,
                identifier: context[i].identifier
              }
            }
            const mappedCid = await getResponseData(req, constants.getForum, createRelatedDiscussions, reqObj, constants.post);
            console.log('mapped cid ', mappedCid)
            if (!(mappedCid && mappedCid.result && mappedCid.result.length > 0)) {
              console.log(`new category mapping to type ${context[i].type} and identifier ${context[i].identifier}`)
              const body = {
                request: {
                    sbIdentifier: context[i].identifier,
                    sbType: context[i].type,
                    cid: cdata.payload.cid
                }
              };
              forumData = await getResponseData(req, constants.createForum, createRelatedDiscussions, body, constants.post);
              console.log(`Category ${cdata.payload.cid} mapped successfull`)
              forumIds.push(forumData.result)
            } else {
              console.log(`category already mapped for type ${context[i].type} and identifier ${context[i].identifier}`)
              mappedCid.result.forEach(cid => forumIds.push(cid));
            }
            if(i === (context.length - 1)){
              forumData.result = forumIds;
              res.send(responseData(req,res,createRelatedDiscussions,forumData, null)); 
            }
          }
        }
      } else {
        console.log('category creation failed')
        console.log('Error is', cdata.message)
        res.send(responseData(req,res,createRelatedDiscussions,null, cdata));
      } 
    }
}

function responseData(req,res, url,data,error) {
  let resObj = {
    id: constants[url],
    status: constants.statusSuccess,
    resCode: constants.resCode,
    data: null
  }
  if(error) {
    res.statusCode = error.statusCode || 500;
    resObj.status = constants.failed;
    resObj.resCode = constants.errorResCode;
    resObj.err = error.statusCode || 500;
    resObj.errmsg = error.message;
    return responseMessage.errorResponse(resObj);
  }
  resObj.data = data.result;
  return responseMessage.successResponse(resObj);
}
async function getResponseData(req, url, upstremUrl, payload, method) {
  try {
  console.log('Preparing request options')
  console.log('original url', req.originalUrl)
  const apiSlug = req.originalUrl.split(upstremUrl).join('');
  console.log('apiSlug', apiSlug)
  const baseUrl = `${constants.http_protocal}://${req.get('host')}${apiSlug}${constants.apiPrefix}`
  const options = {
          uri: baseUrl + url,
          method: method,
          headers: {
            "Authorization": req.headers['authorization']
          },
          json: true
        };
      if(payload) {
        options.body = payload;
      }
    console.log(options)
    const result  = await requestPromise(options);
    return result;
  } catch(error) {
    return error; 
  }
}

async function copyPrivilegesFromCategory(req, res) {
  const payload = { ...req.body.request };
  const cid = payload.cid;
  const pid = payload.pid;
  const uid = payload.uid;
  const categoryPrivilages = await privileges.categories.list(pid);
  categoryPrivilages.groups.forEach(async (group, index) => {
    const groupPrivileges = group.privileges;
    const data = Object.keys(groupPrivileges).filter(x => groupPrivileges[x] === true);
    const reqObj = {
      privileges: data,
      groups: [group.name]
    }
    try {
    const result = await getResponseData(req, `${constants.createPrivileges}?_uid=${uid}`.replace(':cid', cid), copyPrivilages, reqObj , constants.put);
    console.log('Privilege result: ',result)
      if(result && (result['statusCode'] === 401 || result['statusCode'] === 403) ) {
        const error = new Error(result);
        error['statusCode'] = result['statusCode'];
        throw error;
      }
      if(index === (categoryPrivilages.groups.length- 1)){
        res.send(responseData(req,res,copyPrivilages,result, null));
      }
    } catch(error) {
        res.send(responseData(req,res,copyPrivilages,null, error));
        return;
  }
  });
}

Plugin.load = function (params, callback) {
  var router = params.router

  router.post(createSBForum, createSBForumFunc)
  router.post(getSBForum, getSBForumFunc)
  router.post(removeSBForum, removeSBForumFunc)
  router.post(categoryList, getListOfCategories);
  router.post(tagsList, getTagsRelatedTopics);
  router.post(createRelatedDiscussions, relatedDiscussions);
  router.post(copyPrivilages, copyPrivilegesFromCategory);

  router.post(
    createForumURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    createForumAPI
  )
  router.post(
    allTopicsByCategoryURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    allTopicsByCategory
  )
  router.post(
    allPostsByTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    allPostsByTopic
  )
  router.post(
    getForumURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    getForumAPI
  )
  router.post(
    createTenantURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    setupOrgAPI
  )
  router.post(
    createSectionURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    addSectionURL
  )
  router.put(
    banUserURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    banUserAPI
  )
  router.delete(
    unbanUserURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    unbanUserAPI
  )
  router.post(
    createTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    createTopicAPI
  )
  router.post(createCatwithSubcatURL, createCatwithSubcat)
  router.post(
    replyTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    replyTopicAPI
  )
  router.post(
    voteURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    voteURLAPI
  )
  router.delete(
    deletePostURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    deletePostAPI
  )
  router.delete(
    deleteTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    deleteTopicAPI
  )
  router.delete(
    purgeTopicURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    purgeTopicAPI
  )
  router.delete(
    purgePostURL,
    apiMiddleware.requireUser,
    apiMiddleware.requireAdmin,
    purgePostAPI
  )
  callback()
}