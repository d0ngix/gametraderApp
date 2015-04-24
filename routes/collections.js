/**
 * New node file
 */

var express = require('express');
var router = express.Router();

var Collection     = require('../models/collections');
var User     = require('../models/users');
var Game     = require('../models/games');

router
	.post('/', function(req, res){
		//Check if user_id and game_id exist
		var countColletion = Collection.count({user_id: req.body.user_id, game_id: req.body.game_id}, function (err, count){			
			
			if(err) res.send(err);
			if(count) return res.json({status: 0, message:'Game already exist in your collection!'});
			
			User.findById(req.body.user_id, function(err, user){
				if(err) res.send(err);
				if(!user) return res.json({status: 0, message:'User Not Found!'});

				//Find Game
				Game.findById(req.body.game_id, function(err, game) {
					if(err) res.send(err);
					if(!game) return res.json({status: 0, message:'Game Not Found!'});
					
					//TODO: DELETE
					//updatePrices(game,req.body.game_id, req.body.platforms);return false;
					
					var objCollection = {};
					
					for (var fieldName in req.body) {
						//console.log(fieldName, req.body[fieldName]);
						if(req.body[fieldName]) {
							objCollection[fieldName] = req.body[fieldName];
						}
					}				
					
					var newCollection = new Collection(objCollection);
					
					newCollection.save(function (err, newCollection){
						  if (err) res.send(err);
						  
						  /*Update Games statistics*/
						  updatePrices(game, req.body.game_id, req.body.platforms);
						  
						  return res.json({status: 1, message: newCollection});
					});				
					
				});			
			});			
		});
		//return console.log(countCollection);
	})	
	.get('/', function(req, res){
		// api/collections/?user_id=547c1fce3deccdcc01b0742c
		// http://localhost:8080/api/search/collections?q=547c1fce3deccdcc01b0742c&f=user_id
		
		if(!req.param('user_id')) return res.json({status: 0, message: "User Id Not Set"});
		
		var objWhere = {user_id: req.param('user_id')};
		
		if(req.param('updated')) objWhere.updated = { $gte: new Date(req.param('updated')) };  
		
		Collection
			//.find({user_id: req.param('user_id')})
			.find(objWhere)
			.populate(['game_id','is_sold'])
			.exec(function(err, doc){
				if(err) res.send(err);
				if (!doc.length) return res.json({status: 0, message: "Collection Not Found!"});

				return res.json( {status: 1, 'message': doc} );
			});			
	});

router
	.put('/:collection_id', function(req, res){
		Collection.findById( req.params.collection_id, function(err, collection) {
			if (err) res.send(err);
			if (!collection) return res.json({status: 0, message: "Collection Not Found!"});
			
			for (var fieldName in req.body) {
				if(req.body[fieldName]) {
					collection[fieldName] = req.body[fieldName];
				}
			}		
			
			collection.save(function (err, collection){
				if (err) res.send(err);
				res.json({status: 1, message: collection})
			});
		});
	})
	.get('/:collection_id', function(req, res){
		
		Collection
			.findById( req.params.collection_id)
			.populate('game_id')
			.exec(function(err, doc){
				if(err) res.send(err);		
				if(!doc) return res.json({status: 0, message: "Collection Not Found!"})
				
				return res.json({status: 1, message: doc});
			});
			
	})
	.delete('/:collection_id', function(req, res){
		Collection.remove( { _id: req.params.collection_id }, function( err, collection ){
			if (err) res.send(err);
			if (!collection) return res.json({status: 0, message: "Collection Not Found!"});
			
			res.json({status: 1, message: 'Collection Deleted Successfully!'});
		});
	});	


/* *
 * updatePrices - udpate the prices on a particular game
 * @params
 * - game - Object
 * - game_id - String
 * - platform - String
 * @return Obj 
 * - { usedItem: { avg: 15, low: 10, high: 20 }, newItem: { avg: 50, low: 50, high: 50 } }  
 * @procedure
 * - search all the games in users collections based on game_id and platform
 * - iterate the result and get high/low/avg
 * - update the game  
 * */
var updatePrices = function(objGame, game_id, platform) {

	Collection.find({game_id: game_id, platforms:platform}, function (err, collection){
		if (err) res.send(err);

		var prices = {usedItem:{avg: null, low: null, high: null, platform: platform.join()}, newItem:{avg: null, low: null, high: null, platform:platform.join() }};
		var usedCounter = newCounter = 0;
		
		collection.forEach(function(obj){
			if ( obj.condition.toLowerCase() == 'used' ) {
				usedCounter++;
				if ( prices.usedItem.low == null || obj.price < prices.usedItem.low ) prices.usedItem.low = obj.price; 
				if ( prices.usedItem.high == null || obj.price > prices.usedItem.high) prices.usedItem.high = obj.price;
				prices.usedItem.avg = prices.usedItem.avg + obj.price;

			} else if ( obj.condition.toLowerCase() == 'new' ) { 
				newCounter++;
				if ( prices.newItem.low == null || obj.price < prices.newItem.low ) prices.newItem.low = obj.price; 
				if ( prices.newItem.high == null || obj.price > prices.newItem.high) prices.newItem.high = obj.price;
				prices.newItem.avg = prices.newItem.avg + obj.price;				

			}		
		});
		prices.usedItem.avg = prices.usedItem.avg / usedCounter;
		prices.newItem.avg = prices.newItem.avg / newCounter;
		
/*						   	
		"statistics": {
			"prices": {
				"usedItem": [{"avg":16.25, "low":10, "high":20, "platform":"PS3"}, {"avg":16.25, "low":10, "high":20, "platform":"XBOX"}],
				"newItem": {"avg": 50, "low": 50, "high": 50, "platform": "PS3"}
			},
			"hits": 0,
			"counter": [ ]
		},
*/
		//Used Games
		var usedItemFoundFlag = false;
		if (usedCounter) {
			objGame.statistics.prices.usedItem.forEach(function(obj,i){
				if(obj.platform == platform.join()){
					//obj.avg
					objGame.statistics.prices.usedItem[i].avg = prices.usedItem.avg;
					objGame.statistics.prices.usedItem[i].high = prices.usedItem.high;
					objGame.statistics.prices.usedItem[i].low = prices.usedItem.low;
					usedItemFoundFlag = true;
				}
			});
		}		
		if (!usedItemFoundFlag && objGame.statistics.prices.usedItem.length == 0) objGame.statistics.prices.usedItem.push(prices.usedItem);
		//console.log(objGame.statistics.prices.usedItem);

		//New Games
		var newItemFoundFlag = false;
		if (newCounter) {
			objGame.statistics.prices.newItem.forEach(function(obj,i){
				if(obj.platform === platform.join()){
					//obj.avg
					objGame.statistics.prices.newItem[i].avg = prices.newItem.avg;
					objGame.statistics.prices.newItem[i].high = prices.newItem.high;
					objGame.statistics.prices.newItem[i].low = prices.newItem.low;
					newItemFoundFlag = true;
				}
			});
		}		
		if (!newItemFoundFlag && objGame.statistics.prices.newItem.length == 0) objGame.statistics.prices.newItem.push(prices.newItem);		
		//console.log(objGame.statistics.prices.newItem)
		
		//console.log(objGame.statistics.prices);
		objGame.save(function (err, game1){
			if (err) res.send(err);
			//console.log(game1.statistics.prices);
		}); 

	});
}

module.exports = router;
