var app = angular.module('egowebApp', ['ngRoute']);

app.config(function ($routeProvider) {
    
    $routeProvider

    .when('/page/:page', {
        templateUrl: '/angular/interview.html',
        controller: 'interviewController'
    })
    
});

app.factory("saveAlter", function($http, $q) {
   var getAlters = function() {
       var saveUrl = document.location.protocol + "//" + document.location.host + "/interview/alter";
       return $.post(saveUrl, $("#alterForm").serialize(), function(data) {
           return data; 
       });
    }
   return {
       getAlters : getAlters
   }
});

app.factory("deleteAlter", function($http, $q) {
   var getAlters = function() {
       var saveUrl = document.location.protocol + "//" + document.location.host + "/interview/deletealter";
       return $.post(saveUrl, $("#deleteAlterForm").serialize(), function(data) {
           return data; 
       });
    }
   return {
       getAlters : getAlters
   }
});

app.directive("questionList", function() {
   return {
       restrict: 'AECM',
       templateUrl: '/angular/questions.html',
       replace: false
   }
});


app.controller('interviewController', ['$scope', '$log', '$routeParams','$sce', '$location', '$route', "saveAlter", "deleteAlter", function($scope, $log, $routeParams, $sce, $location, $route, saveAlter, deleteAlter) {
    $scope.questions = buildQuestions($routeParams.page, interviewId);
    $scope.page = $routeParams.page;
    $scope.csrf = csrf;
    $scope.interviewId = interviewId;
    $scope.answers = answers;
    $scope.options = new Object;
    $scope.alters = alters;
    $scope.askingStyleList = false;
    $scope.hideQ = false;
    $scope.pageQ = false;
    $scope.prompt = "";
    $scope.dates = new Object;
    $scope.time_spans = new Object;

	questionOrder = [];
	for (var l in $scope.questions) {
		if(typeof offset == "undefined")
			var offset = $scope.questions[l].ORDERING;
		if($scope.questions[l].SUBJECTTYPE == "EGO_ID")
			questionOrder[$scope.questions[l].ORDERING] = $scope.questions[l].ID;
		else
			questionOrder[$scope.questions[l].ORDERING - offset] = $scope.questions[l].ID;
	}

    for(var k in $scope.questions){
        $scope.questions[k].array_id = k;
        if($scope.questions[k].CITATION)
            $scope.questions[k].CITATION = $scope.questions[k].CITATION.replace(/(<([^>]+)>)/ig, '');
        $scope.options[k] = $.extend(true,{}, options[$scope.questions[k].ID]);;
        if($scope.questions[k].ASKINGSTYLELIST == true)
            $scope.askingStyleList = k;
        if($scope.askingStyleList != false)
            $scope.fixedWidth = "120px";
        else
            $scope.fixedWidth = "auto";

        if($scope.pageQ == false)
            $scope.pageQ = $scope.questions[k].SUBJECTTYPE;

        if($scope.questions[k].ANSWERTYPE == "PREFACE" || $scope.questions[k].ANSWERTYPE == "ALTER_PROMPT")
            $scope.hideQ = true;

        for(o in $scope.options[k]){
            $scope.options[k][o].checked = false;
            if(typeof answers[k] != "undefined"){
                var values = answers[k].VALUE.split(',');
                if(values.indexOf($scope.options[k][o].ID.toString()) != -1)
                    $scope.options[k][o].checked = true;
            }
        }

        if(typeof $scope.answers[k] == "undefined"){
            $scope.answers[k] = new Object;
            $scope.answers[k].VALUE = "";
            $scope.answers[k].INTERVIEWID = interviewId;
            $scope.answers[k].SKIPREASON = "NONE";
        }else{
            if($scope.answers[k].VALUE == "-4")
                $scope.answers[k].VALUE = "";
        }

        if($scope.questions[k].ANSWERTYPE == "TIME_SPAN"){
            $scope.time_spans[k] = new Object;
			if(answers[k].VALUE.match(/(\d*)\sYEARS/))
                $scope.time_spans[k].YEARS = answers[k].VALUE.match(/(\d*)\sYEARS/)[1];
			if(answers[k].VALUE.match(/(\d*)\sMONTHS/))
                $scope.time_spans[k].MONTHS = answers[k].VALUE.match(/(\d*)\sMONTHS/)[1];
			if(answers[k].VALUE.match(/(\d*)\sWEEKS/))
                $scope.time_spans[k].WEEKS = answers[k].VALUE.match(/(\d*)\sWEEKS/)[1];
			if(answers[k].VALUE.match(/(\d*)\sDAYS/))
                $scope.time_spans[k].DAYS = answers[k].VALUE.match(/(\d*)\sDAYS/)[1];
			if(answers[k].VALUE.match(/(\d*)\sHOURS/))
                $scope.time_spans[k].HOURS = answers[k].VALUE.match(/(\d*)\sHOURS/)[1];
			if(answers[k].VALUE.match(/(\d*)\sMINUTES/))
                $scope.time_spans[k].MINUTES = answers[k].VALUE.match(/(\d*)\sMINUTES/)[1];
        }

        if($scope.questions[k].DONTKNOWBUTTON){
            var button = new Object;
            button.NAME = "Don't Know";
            button.ID = "DONT_KNOW";
            button.checked = false;
            if($scope.answers[k].SKIPREASON == "DONT_KNOW")
                button.checked = true;
            $scope.options[k][Object.keys($scope.options[k]).length] = button;
        }

        if($scope.questions[k].REFUSEBUTTON){
            var button = new Object;
            button.NAME = "Refuse";
            button.ID = "REFUSE";
            button.checked = false;
            if($scope.answers[k].SKIPREASON == "REFUSE")
                button.checked = true;
            $scope.options[k][Object.keys($scope.options[k]).length] = button;
        }

        if($scope.questions[k].SUBJECTTYPE != "EGO_ID"){
            if($scope.prompt == "")
                $scope.prompt = $sce.trustAsHtml($scope.questions[k].PROMPT);
        }else{
            $scope.questions[k].PROMPT = $scope.questions[k].PROMPT.replace(/(<([^>]+)>)/ig, '');
        }
    }

    $scope.errors = new Object;

    $scope.goBack = function() {
        var url = $location.absUrl().replace($location.url(),'');
        document.location = url + "/page/" + (parseInt($routeParams.page) - 1);
    }

    $scope.submitForm = function(isValid) {
        // check to make sure the form is completely valid
        if (isValid) {
            save($scope.questions, $routeParams.page, $location.absUrl().replace($location.url(),''));
        }
    };

    $scope.addAlter = function(isValid) {
        // check to make sure the form is completely valid
        saveAlter.getAlters().then(function(data){
            alters = JSON.parse(data);
            $route.reload();
        });
    };

    $scope.removeAlter = function(alterId) {
        $("#deleteAlterId").val(alterId);
        console.log(alterId);
        // check to make sure the form is completely valid
        deleteAlter.getAlters().then(function(data){
            alters = JSON.parse(data);
            $route.reload();
        });
    };

    $scope.multiSelect = function (v, index, array_id, maxCheck){

    	if($scope.answers[array_id].VALUE)
    		values = $scope.answers[array_id].VALUE.split(',');
    	else
    		values = [];

        if(v == "DONT_KNOW" || v == "REFUSE"){
            if($scope.options[array_id][index].checked){
        		for(k in $scope.options[array_id]){
            		if(k != index)
                		$scope.options[array_id][k].checked = false;
        		}
        		$scope.answers[array_id].VALUE = "";
        		$scope.answers[array_id].OTHERSPECIFYTEXT = "";
        		$scope.answers[array_id].SKIPREASON = v;
        	}else{
        		$scope.answers[array_id].SKIPREASON = "NONE";
        	}
        }else{
            if($scope.options[array_id][index].checked){
        		$scope.answers[array_id].SKIPREASON = "NONE";
        		for(k in $scope.options[array_id]){
            		if($scope.options[array_id][k].ID == "DONT_KNOW" || $scope.options[array_id][k].ID == "REFUSE")
                		$scope.options[array_id][k].checked = false;
        		}
    			if(values.indexOf(v.toString()) == -1)
    				values.push(v.toString());
    		}else{
    			if(values.indexOf(v.toString()) != -1){
    				values.splice(values.indexOf(v),1);
                }
    		}
        	if(values.length > maxCheck){
        		value = values.shift();
        		for(k in $scope.options[array_id]){
            		if($scope.options[array_id][k].ID == value)
            		    $scope.options[array_id][k].checked = false;
        		}
        	}
        	$scope.answers[array_id].VALUE = values.join(',');
        }

    }

    $scope.timeValue = function (array_id){
    	var date = $scope.time_spans[array_id].YEARS + ' YEARS ' +
    		$scope.time_spans[array_id].MONTHS + ' MONTHS ' +
    		$scope.time_spans[array_id].WEEKS + ' WEEKS ' +
    		$scope.time_spans[array_id].DAYS + ' DAYS ' +
    		$scope.time_spans[array_id].HOURS + ' HOURS ' +
    		$scope.time_spans[array_id].MINUTES + ' MINUTES';
    	$scope.answers[array_id].VALUE = date;
    	console.log(date);
    }

    $scope.dateValue = function (array_id){
    	item = '.time-' + array_id;
    	if($(item + '#MINUTE').val() != '' && parseInt($(item + '#MINUTE').val()) < 10)
    		$(item + '#MINUTE').val('0' + parseInt($(item + '#MINUTE').val()));
    	date = $(item + '#MONTH option:selected').val() + ' ' +
    		$(item + '#DAY').val() + ' ' +
    		$(item + '#YEAR').val() + ' ' +
    		$(item + '#HOUR').val() + ':' +
    		$(item + '#MINUTE').val() + ' ' +
    		$(item + '#AMPM:checked').val();
    	$scope.answers[array_id].VALUE = date;
    	console.log(date);
    
    }

}]);

function save (questions, page, url){
    var saveUrl = document.location.protocol + "//" + document.location.host + "/interview/save";
    if(typeof questions[0] == "undefined"){
        $.post(saveUrl, $('#answerForm').serialize(), function(data){
            answers = JSON.parse(data);
            console.log(answers);
            for(k in answers){
                interviewId = answers[k].INTERVIEWID;
                studyId = answers[k].STUDYID;
                break;
            }
            document.location = document.location.protocol + "//" + document.location.host + "/interview/" + studyId + "/" + interviewId + "#/page/" + (parseInt(page) + 1);
        });
    }else{
        document.location = url + "/page/" + (parseInt(page) + 1);
    }
}

app.directive('checkAnswer', [function (){ 
   return {
        require: 'ngModel',
        link: function(scope, elem, attr, ngModel) {
          //For DOM -> model validation
            ngModel.$parsers.unshift(function(value) {
                var valid = true;
                array_id = attr.arrayId;
                console.log("check");
                if(attr.answerType == "ALTER_PROMPT"){
        			if(Object.keys(alters).length < study.MINALTERS){
        				scope.errors[array_id] = 'Please list ' + study.MINALTERS + ' people';
                    	valid = false;
        			}
			    }

                if(attr.answerType == "TEXTUAL"){
                    if(value == "" && scope.answers[array_id].SKIPREASON == "NONE"){
                        scope.errors[array_id] = "Value cannot be blank";
                    	valid = false;
                    }
                }

        		if(attr.answerType == "NUMERICAL"){
        			var min = ""; var max = ""; var numberErrors = 0; var showError = false;
        			if((value == "" && scope.answers[array_id].SKIPREASON == "NONE") || (value != "" && isNaN(parseInt(value)))){
                        scope.errors[array_id] = 'Please enter a number';
                        valid = false;
                    }
        			if(scope.questions[array_id].MINLIMITTYPE == "NLT_LITERAL"){
        				min = scope.questions[array_id].MINLITERAL;
        			}else if(scope.questions[array_id].MINLIMITTYPE == "NLT_PREVQUES"){
        				min = scope.answers[scope.questions[array_id].MINPREVQUES].VALUE;
        			}
        			if(scope.questions[array_id].MAXLIMITTYPE == "NLT_LITERAL"){
        				max = scope.questions[array_id].MAXLITERAL;
        			}else if(scope.questions[array_id].MAXLIMITTYPE == "NLT_PREVQUES"){
        				max = scope.answers[scope.questions[array_id].MAXPREVQUES].VALUE;
        			}
        			if(min !== "")
        				numberErrors++;
        			if(max !== "")
        				numberErrors = numberErrors + 2;
        			if(((max !== "" && parseInt(value) > parseInt(max))  ||  (min !== "" && parseInt(value) < parseInt(min))) && scope.answers[array_id].SKIPREASON == "NONE")
        				showError = true;
        
        			if(numberErrors == 3 && showError)
        				errorMsg = "The range of valid answers is " + min + " to " + max + ".";
        			else if (numberErrors == 2 && showError)
        				errorMsg = "The range of valid answers is " + max + " or fewer.";
        			else if (numberErrors == 1 && showError)
        				errorMsg = "The range of valid answers is " + min + " or greater.";
        
        			if(showError){
                        scope.errors[array_id] = errorMsg;
                        valid = false;
        			}
        		}
    
                if(attr.answerType == "DATE"){
                    console.log(attr.answerType);
        			var date = value.match(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}) (\d{4})/);
        			var time = value.match(/(\d+):(\d+) (AM|PM)/);
        			if(typeof time != "undefined" && time && time.length > 2){
        			    if(parseInt(time[1]) < 1 || parseInt(time[1]) > 12){
                            scope.errors[array_id] = 'Please enter 1 to 12 for HH';
                        	valid = false;
        			    }
        			    console.log(time);
        			    if(parseInt(time[2]) < 0 || parseInt(time[2]) > 59){
        			    	scope.errors[array_id] = 'Please enter 0 to 59 for MM';
        				    valid = false;
        			    }
        			}else{
        		    	scope.errors[array_id] = 'Please enter the time of day';
        			    valid = false;
        			}
        			if(typeof date != "undefined" && date && date.length > 3){
        			    if(parseInt(date[2]) < 1 || parseInt(date[2]) > 31){
        			    	scope.errors[array_id] = 'Please enter a different number for the day of month';
        					valid = false;
        			    }
        			}
        		}
    
        		if(attr.answerType == "MULTIPLE_SELECTION"){
            		var showError = false;
        			min = scope.questions[array_id].MINCHECKABLEBOXES;
        			max = scope.questions[array_id].MAXCHECKABLEBOXES;
        			var numberErrors = 0; var showError = false; var errorMsg = "";
        			if(min !== "")
        				numberErrors++;
        			if(max !== "")
        				numberErrors = numberErrors + 2;
        
        			checkedBoxes = value.split(',').length;
        			if(!value)
        				checkedBoxes = 0;
        
        			if ((checkedBoxes < min || checkedBoxes > max) && scope.answers[array_id].SKIPREASON == "NONE")
        				showError = true;
        			//console.log('min:' + min + ':max:' + max + ':checked:' + checkedBoxes+ ":answer:" + value + ":showerror:" + showError);

        			s='';
        			if(max != 1)
        				s = 's';
        			if(parseInt(scope.questions[array_id].ASKINGSTYLELIST) == 1)
        				s += ' for each row';
        			if(numberErrors == 3 && min == max && showError)
        				errorMsg = "Select " + max  + " response" + s + " please.";
        			else if(numberErrors == 3 && min != max && showError)
        				errorMsg = "Select " + min + " to " + max + " response" + s + " please.";
        			else if (numberErrors == 2 && showError)
        				errorMsg = "You may select up to " + max + " response" + s + " please.";
        			else if (numberErrors == 1 && showError)
        				errorMsg = "You must select at least " + min + " response" + s + " please.";
        			//if(answer.OTHERSPECIFYTEXT && showError)
        			//	showError = false;
        
        			if(showError){
                        scope.errors[array_id] = errorMsg;
                        valid = false;
        			}
        		}

                ngModel.$setValidity('checkAnswer', valid);
                return valid ? value : undefined;
            });
          
          ngModel.$formatters.unshift(function(value) {
            var valid = true;
            array_id = attr.arrayId;

                if(attr.answerType == "ALTER_PROMPT"){
        			if(Object.keys(alters).length < study.MINALTERS){
        				scope.errors[array_id] = 'Please list ' + study.MINALTERS + ' people';
                    	valid = false;
        			}
			    }

            if(attr.answerType == "TEXTUAL"){
                if(value == "" && scope.answers[array_id].SKIPREASON == "NONE"){
                    scope.errors[array_id] = "Value cannot be blank";
                	valid = false;
                }
            }
        		if(attr.answerType == "MULTIPLE_SELECTION"){
            		var showError = false;
        			min = scope.questions[array_id].MINCHECKABLEBOXES;
        			max = scope.questions[array_id].MAXCHECKABLEBOXES;
        			var numberErrors = 0; var showError = false; var errorMsg = "";
        			if(min !== "")
        				numberErrors++;
        			if(max !== "")
        				numberErrors = numberErrors + 2;
        
        			checkedBoxes = value.split(',').length;
        			if(!value)
        				checkedBoxes = 0;
        
        			if ((checkedBoxes < min || checkedBoxes > max) && scope.answers[array_id].SKIPREASON == "NONE")
        				showError = true;

        			//console.log('min:' + min + ':max:' + max + ':checked:' + checkedBoxes+ ":answer:" + value + ":showerror:" + showError);

        			s='';
        			if(max != 1)
        				s = 's';
        			if(parseInt(scope.questions[array_id].ASKINGSTYLELIST) == 1)
        				s += ' for each row';
        			if(numberErrors == 3 && min == max && showError)
        				errorMsg = "Select " + max  + " response" + s + " please.";
        			else if(numberErrors == 3 && min != max && showError)
        				errorMsg = "Select " + min + " to " + max + " response" + s + " please.";
        			else if (numberErrors == 2 && showError)
        				errorMsg = "You may select up to " + max + " response" + s + " please.";
        			else if (numberErrors == 1 && showError)
        				errorMsg = "You must select at least " + min + " response" + s + " please.";
        			//if(answer.OTHERSPECIFYTEXT && showError)
        			//	showError = false;
        
        			if(showError){
                        scope.errors[array_id] = errorMsg;
                        valid = false;
        			}else{
            			if(typeof scope.errors[array_id] != "undefined")
            			    delete scope.errors[array_id];
                        valid = true;
        			}
        		}
            ngModel.$setValidity('checkAnswer', valid);
            return value;
          });

      }
   };
}]);

function Question()
{
}

function buildQuestions(pageNumber, interviewId){
	var page = [];
	i = 0;
	page[i] = new Object;
	if(study.INTRODUCTION != ""){
		if(i == pageNumber){
			introduction = new Question();
			introduction.ANSWERTYPE = "INTRODUCTION";
			introduction.PROMPT = study.INTRODUCTION;
			page[i][0] = introduction;
			return page[i];
		}
		i++;
		page[i] = new Object;
	}
	if(pageNumber == i){
		for(j in ego_id_questions){
			page[i][ego_id_questions[j].ID] = ego_id_questions[j];
		}
		return page[i];
	}
	if(interviewId != null){
		i++;
		page[i] = new Object;
		ego_question_list = new Object;
		prompt = "";
		for(j in ego_questions){
			console.log('eval:'+ego_questions[j].TITLE + ":"+ ego_questions[j].ANSWERREASONEXPRESSIONID+":"+evalExpression(ego_questions[j].ANSWERREASONEXPRESSIONID, interviewId));
			if(Object.keys(ego_question_list).length > 0 && prompt != ego_questions[j].PROMPT.replace(/<\/*[^>]*>/gm, '').replace(/(\r\n|\n|\r)/gm,"")){
				if(pageNumber == i){
					page[i] = ego_question_list;
					return page[i];
				}
				ego_question_list = new Object;
				prompt = "";
				i++;
				page[i] = new Object;
			}

			if(evalExpression(ego_questions[j].ANSWERREASONEXPRESSIONID, interviewId) != true)
				continue;

			if(ego_questions[j].PREFACE != ""){
				if(pageNumber == i){
					preface = new Question();
					preface.ID = ego_questions[j].ID;
					preface.ANSWERTYPE = "PREFACE";
					preface.SUBJECTTYPE = "PREFACE";
					preface.PROMPT = ego_questions[j].PREFACE;
					page[i][0] = preface;
					return page[i];
				}
				i++;
				page[i] = new Object;
			}
			if(parseInt(ego_questions[j].ASKINGSTYLELIST)){
			    //console.log(prompt + ":" +ego_questions[j].PROMPT);
			    if(prompt == "" || prompt == ego_questions[j].PROMPT.replace(/<\/*[^>]*>/gm, '').replace(/(\r\n|\n|\r)/gm,"")){
			    	//console.log('list type question');
			    	prompt = ego_questions[j].PROMPT.replace(/<\/*[^>]*>/gm, '').replace(/(\r\n|\n|\r)/gm,"");
			    	ego_questions[j].array_id = ego_questions[j].QUESTIONID;
			    	ego_question_list[ego_questions[j].ID]=ego_questions[j];
			    }
			}else{
			    if(pageNumber == i){
		    		page[i][ego_questions[j].ID] = ego_questions[j];
			    	return page[i];
			    }
			    i++;
			    page[i] = new Object;
			}
		}

		if(Object.keys(ego_question_list).length > 0){
			if(pageNumber == i){
				page[i] = ego_question_list;
				return page[i];
			}
			i++;
			page[i] = new Object;
		}

		if(pageNumber == i && study.ALTERPROMPT.replace(/<\/*[^>]*>/gm, '').replace(/(\r\n|\n|\r)/gm,"") != ""){
			alter_prompt = new Question();
			alter_prompt.ANSWERTYPE = "ALTER_PROMPT";
			alter_prompt.PROMPT = study.ALTERPROMPT;
			alter_prompt.studyId = study.ID;
			page[i][0] = alter_prompt;
			return page[i];
		}
		i++;
		page[i] = new Object;
		if(Object.keys(alters).length > 0){
			for(j in alter_questions){
				alter_question_list = new Object;
				for(k in alters){
					if(evalExpression(alter_questions[j].ANSWERREASONEXPRESSIONID, alters[k].INTERVIEWID, alters[k].ID) != true)
						continue;

					question = $.extend(true,{}, alter_questions[j]);
					question.PROMPT = question.PROMPT.replace(/\$\$/g, alters[k].NAME);
					question.ALTERID1 = alters[k].ID;
			    	question.array_id = question.QUESTIONID + '-' + question.ALTERID1;

					if(alter_questions[j].ASKINGSTYLELIST == 1){
						alter_question_list[question.ID + '-' + question.ALTERID1] = question;
					}else{
						if(alter_questions[j].PREFACE != ""){
							if(i == pageNumber){
								preface = new Question();
								preface.ID = alter_questions[j].ID;
								preface.ANSWERTYPE = "PREFACE";
								preface.SUBJECTTYPE = "PREFACE";
								preface.PROMPT = alter_questions[j].PREFACE;
								page[i][0] = preface;
								return page[i];
							}
							alter_questions[j].PREFACE = "";
							i++;
							page[i] = new Object;
						}
						if(i == pageNumber){
							page[i][question.ID + '-' + question.ALTERID1] = question;
							return page[i];
						}else {
							i++;
							page[i] = new Object;
						}
					}
				}
				if(alter_questions[j].ASKINGSTYLELIST == 1){
					if(Object.keys(alter_question_list).length > 0){
						if(alter_questions[j].PREFACE != ""){
							if(i == pageNumber){
								preface = new Question();
								preface.ID = alter_questions[j].ID;
								preface.ANSWERTYPE = "PREFACE";
								preface.SUBJECTTYPE = "PREFACE";
								preface.PROMPT = alter_questions[j].PREFACE;
								page[i][0] = preface;
								return page[i];
							}
							i++;
							page[i] = new Object;
						}
						if(i == pageNumber){
							page[i] = alter_question_list;
							return page[i];
						}
						i++;
						page[i] = new Object;
					}
				}
			}

			for(j in alter_pair_questions){
				var alters2 = $.extend(true,{}, alters);
				preface = new Question();
				preface.ID = alter_pair_questions[j].ID;
				preface.ANSWERTYPE = "PREFACE";
				preface.SUBJECTTYPE = "PREFACE";
				preface.PROMPT = alter_pair_questions[j].PREFACE;
				for(k in alters){
					if(alter_pair_questions[j].SYMMETRIC){
    					var keys = Object.keys(alters2);
    					delete alters2[keys[0]];
					}
						//alters2.shift();
					alter_pair_question_list = new Object;
					for(l in alters2){
						if(alters[k].ID == alters2[l].ID)
							continue;
						if(evalExpression(alter_pair_questions[j].ANSWERREASONEXPRESSIONID, interviewId, alters[k].ID, alters2[l].ID) != true)
							continue;
						question = $.extend(true,{}, alter_pair_questions[j]);
						question.PROMPT = question.PROMPT.replace(/\$\$1/g, alters[k].NAME);
						question.PROMPT = question.PROMPT.replace(/\$\$2/g, alters2[l].NAME);
						question.ALTERID1 = alters[k].ID;
						question.ALTERID2 = alters2[l].ID;
                        question.array_id = question.QUESTIONID + '-' + question.ALTERID1 + 'and' + question.ALTERID2;

						if(alter_pair_questions[j].ASKINGSTYLELIST){
							alter_pair_question_list[question.ID + '-' + question.ALTERID1 + 'and' + question.ALTERID2] = question;
						}else{
							if(preface.PROMPT != ""){
								if(i == pageNumber){
									page[i][0] = preface;
									return page[i];
								}
								preface.PROMPT = "";
								i++;
								page[i] = new Object;
							}
							if(i == pageNumber){
								page[i][question.ID + '-' + question.ALTERID1 + 'and' + question.ALTERID2] = question;
								return page[i];
							}else{
								i++;
								page[i] = new Object;
							}
						}
					}
					if(alter_pair_questions[j].ASKINGSTYLELIST){
						if(Object.keys(alter_pair_question_list).length > 0){
							if(preface.PROMPT != ""){
								if(i == pageNumber){
									page[i][0] = preface;
									return page[i];
								}
								preface.PROMPT = "";
								i++;
								page[i] = new Object;
							}
							if(i == pageNumber){
								page[i] = alter_pair_question_list;
								return page[i];
							}
							i++;
							page[i] = new Object;
						}
					}
				}
			}
    		for(j in network_questions){
    			console.log('eval:'+network_questions[j].TITLE + ":"+ network_questions[j].ANSWERREASONEXPRESSIONID+":"+evalExpression(network_questions[j].ANSWERREASONEXPRESSIONID, interviewId));

    			if(evalExpression(network_questions[j].ANSWERREASONEXPRESSIONID, interviewId) != true)
    				continue;
    
    			if(network_questions[j].PREFACE != ""){
    				if(pageNumber == i){
    					preface = new Question();
    					preface.ID = network_questions[j].ID;
    					preface.ANSWERTYPE = "PREFACE";
    					preface.SUBJECTTYPE = "PREFACE";
    					preface.PROMPT = network_questions[j].PREFACE;
    					page[i][0] = preface;
    					return page[i];
    				}
    				i++;
    				page[i] = new Object;
    			}

    			    if(pageNumber == i){
    		    		page[i][network_questions[j].ID] = network_questions[j];
    			    	return page[i];
    			    }
    			    i++;
    			    page[i] = new Object;
    		}
		}
		conclusion = new Question;
		conclusion.ANSWERTYPE = "CONCLUSION";
		conclusion.PROMPT = study.CONCLUSION;
		page[i][0] = conclusion;
		return page[i];

	}
	return false;
}

function evalExpression(id, interviewId, alterId1, alterId2)
{

	var array_id;
    if(!id || id == 0)
        return true;

        console.log(id);
    questionId = expressions[id].QUESTIONID;
    subjectType = "";
    if(questionId)
        subjectType = questions[questionId].SUBJECTTYPE;
        
    /*
	if(expressions[id] && expressions[id].QUESTIONID){
		if(typeof study.MULTISESSIONEGOID != "undefined" && parseInt(study.MULTISESSIONEGOID) != 0){
			var interviewIds = getInterviewIds(interviewId);
			for(k in interviewIds){
				var studyId = db.queryValue("SELECT studyId FROM interview WHERE id = " + interviewIds[k]);
				if(db.queryValue("SELECT id FROM question WHERE id = "  + id + "and studyId = " + studyId))
					interviewId = interviewIds[k];
			}
		}
	}*/

    comparers = {
    	'Greater':'>',
    	'GreaterOrEqual':'>=',
    	'Equals':'==',
    	'LessOrEqual':'<=',
    	'Less':'<'
    };

    if(questionId)
    	array_id = questionId;
    if(typeof alterId1 != 'undefined' && subjectType == 'ALTER')
    	array_id += "-" + alterId1;
    else if(typeof alterId2 != 'undefined' && subjectType == 'ALTER_PAIR')
    	array_id += 'and' + alterId2;
    
    if(typeof answers[array_id] != "undefined")
		answer = answers[array_id].VALUE;
    else
    	answer = "";
	
    if(expressions[id].TYPE == "Text"){
    	if(!answer)
    		return expressions[id].RESULTFORUNANSWERED;
    	if(expressions[id].OPERATOR == "Contains"){
    		if(answer.indexOf(expressions[id].VALUE) != -1)
    			return true;
    	}else if(expressions[id].OPERATOR == "Equals"){
    		if(answer == expressions[id].VALUE)
    			return true;
    	}
    }
    if(expressions[id].TYPE == "Number"){
    	if(!answer)
    		return expressions[id].RESULTFORUNANSWERED;
    	logic = answer + " " + comparers[expressions[id].OPERATOR] + " " + expressions[id].VALUE;
    	result = eval(logic);
    	return result;
    }
    if(expressions[id].TYPE == "Selection"){
    	if(!answer)
    		return expressions[id].RESULTFORUNANSWERED;
    	selectedOptions = answer.split(',');
    	var options = expressions[id].VALUE.split(',');
    	trues = 0;
    	for (var k in selectedOptions) {
    		if(expressions[id].OPERATOR == "Some" && options.indexOf(selectedOptions[k]) != -1)
    			return true;
    		if(expressions[id].OPERATOR == "None" && options.indexOf(selectedOptions[k]) != -1)
    			return false;
    		if(options.indexOf(selectedOptions[k]) != -1)
    			trues++;
    	}
    	if(expressions[id].OPERATOR == "None" || (expressions[id].OPERATOR == "All" && trues >= options.length))
    		return true;
    }
    if(expressions[id].TYPE == "Counting"){
    	countingSplit = expressions[id].VALUE.split(':');
		times = countingSplit[0];
		expressionIds = countingSplit[1];
		questionIds = countingSplit[2];

    	count = 0;
    	if(expressionIds != ""){
    		expressionIds = expressionIds.split(',');
    		for (var k in expressionIds) {
    			count = count + countExpression(expressionIds[k], interviewId, alterId1, alterId2);
    		}
    	}
    	if(questionIds != ""){
    		questionIds = questionIds.split(',');
    		for (var k in questionIds) {
    			count = count + countQuestion(questionIds[k], interviewId, expressions[id].OPERATOR);
    		}
    	}
    	return (times * count);
    }
    if(expressions[id].TYPE == "Comparison"){
    	compSplit =  expressions[id].VALUE.split(':');
    	value = parseInt(compSplit[0]);
    	expressionId = parseInt(compSplit[1]);
    	result = evalExpression(expressionId, interviewId, alterId1, alterId2);
    	logic = result + " " + comparers[expressions[id].OPERATOR] + " " + value;
    	result = eval(logic);
    	return result;
    }
    if(expressions[id].TYPE == "Compound"){
	    console.log( expressions[id].NAME + ":" + expressions[id].VALUE);
    	subexpressions = expressions[id].VALUE.split(',');
    	var trues = 0;
    	for (var k in subexpressions) {
    		// prevent infinite loops!
    		console.log(expressions[id].NAME +":subexpression:"+ k +":");
    		if(parseInt(subexpressions[k]) == id)
    			continue;
    		isTrue = evalExpression(parseInt(subexpressions[k]), interviewId, alterId1, alterId2);
    		if(expressions[id].OPERATOR == "Some" && isTrue){
    			return true;
    		}
    		if(isTrue)
    			trues++;
    	}
    	if(expressions[id].OPERATOR == "None" && trues == 0)
    		return true;
    	else if (expressions[id].OPERATOR == "All" && trues == subexpressions.length)
    		return true;
    }
    return false;

}

function countExpression(id, interviewId)
{
    if(evalExpression(id, interviewId))
    	return 1;
    else
    	return 0;
}

function countQuestion(questionId, interviewId, operator, alterId1, alterId2)
{
    if(questionId)
    	array_id = questionId;
    if(typeof alterId1 != 'undefined' && subjectType == 'ALTER')
    	array_id += "-" + alterId1;
    else if(typeof alterId2 != 'undefined' && subjectType == 'ALTER_PAIR')
    	array_id += 'and' + alterId2;
    if(typeof answers[array_id] != "undefined")
		answer = answers[array_id].VALUE;
    else
    	answer = "";

    if(!answer){
    	return 0;
    }else{
    	if(operator == "Sum")
    		return answer;
    	else
    		return 1;
    }
}