/**
 * New node file
 */
var User     = require('../models/users');

module.exports = {
		getUserRatings: function  (objList , callback) {
			var results = [];
			objList.forEach ( function (obj, i) {
				async(obj, function(result){
					results.push(result);
					if(results.length == objList.length)
						callback(results); 
					
				})
			});
			
			function async(arg, callback) {
				//Get Ratings
				User.findOne({_id:arg.user_id.id}, {email:1, ratings:1, user_name:1},function(err, user){
					var five = four = three = two = one = 0;
					if ( typeof user.ratings.five != 'undefined' ) 	five	= user.ratings.five;
					if ( typeof user.ratings.four != 'undefined' ) 	four 	= user.ratings.four;
					if ( typeof user.ratings.three != 'undefined' )	three	= user.ratings.three;
					if ( typeof user.ratings.two != 'undefined' )	two		= user.ratings.two;
					if ( typeof user.ratings.one != 'undefined' )	one		= user.ratings.one;
				
					//weighted average
					ratings = ( 5 * five + 4 * four + 3 * three + 2 * two + 1 * one ) / ( five + four + three + two + one );

					arg.user_id.ratings = ratings
					callback(arg);					
				});				
			}
		}		
}