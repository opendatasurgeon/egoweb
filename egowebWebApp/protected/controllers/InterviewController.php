<?php

class InterviewController extends Controller
{

	/**
	 * Lists all models.
	 */
	public function actionIndex()
	{
		$condition = "id != 0";
		if(!Yii::app()->user->isSuperAdmin){
            #OK FOR SQL INJECTION
			$studies = q("SELECT studyId FROM interviewers WHERE interviewerId = " . Yii::app()->user->id)->queryColumn();
			if($studies)
				$condition = "id IN (" . implode(",", $studies) . ")";
			else
				$condition = "id = -1";
		}

		$criteria = array(
			'condition'=>$condition . " AND multiSessionEgoId = 0 AND active = 1",
			'order'=>'id DESC',
		);

		$single = Study::model()->findAll($criteria);

		$criteria = array(
			'condition'=>$condition . " AND multiSessionEgoId <> 0 AND active = 1",
			'order'=>'multiSessionEgoId DESC',
		);

		$multi = Study::model()->findAll($criteria);

		$this->render('index',array(
			'single'=>$single,
			'multi'=>$multi,
		));
	}

	public function actionStudy($id)
	{
		$egoIdQ = q("SELECT * from question where studyId = $id and useAlterListField in ('name','email','id')")->queryRow();
		$restrictions = "";
		if($egoIdQ){
			$participants = q("SELECT " . $egoIdQ['useAlterListField'] . " FROM alterList where interviewerId = " . Yii::app()->user->id)->queryColumn();
			foreach($participants as &$p){
    			if(strlen($p) >= 8)
    			    $p = decrypt($p);
			}
			if($participants){
        		$criteria = array(
        			'condition'=>"questionId = " .$egoIdQ['id'],
        		);
                $answers = Answer::model()->findAll($criteria);
                foreach($answers as $answer){
                    if(in_array($answer->value, $participants))
                        $interviewIds[] = $answer->interviewId;
                }
				if($interviewIds)
					$restrictions = ' and id in (' . implode(",", $interviewIds) . ')';
				else
					$restrictions = ' and id = -1';
			}
		}
		$criteria=array(
			'condition'=>'completed > -1 && studyId = '.$id . $restrictions,
			'order'=>'id DESC',
		);
		$dataProvider=new CActiveDataProvider('Interview',array(
			'criteria'=>$criteria,
		));
		$this->renderPartial('study', array(
			'dataProvider'=>$dataProvider,
			'studyId'=>$id,
		),false,false);
	}

	/**
	 * Main page.
	 */
	public function actionView($id)
	{
        $study = Study::model()->findByPk($id);
        if ($study->multiSessionEgoId)
            $multiIds = q("SELECT studyId FROM question WHERE title = (SELECT title FROM question WHERE id = " . $study->multiSessionEgoId . ")")->queryColumn();
        else
            $multiIds = $study->id;
        $this->pageTitle = $study->name;
        $expressions = array();
        $results = Expression::model()->findAllByAttributes(array("studyId"=>$multiIds));
        foreach($results as $result)
            $expressions[$result->id] = mToA($result);
        $questions = array();
        $results = Question::model()->findAllByAttributes(array("studyId"=>$multiIds), array('order'=>'ordering'));
        foreach($results as $result){
            $questions[$result->id] = mToA($result);
            if($id == $result->studyId){
                if($result->subjectType == "EGO_ID")
                    $ego_id_questions[] = mToA($result);
                if($result->subjectType == "EGO")
                    $ego_questions[] = mToA($result);
                if($result->subjectType == "ALTER")
                    $alter_questions[] = mToA($result);
                if($result->subjectType == "ALTER_PAIR")
                    $alter_pair_questions[] = mToA($result);
                if($result->subjectType == "NETWORK")
                    $network_questions[] = mToA($result);
            }
        }
        $options = array();
        $results = QuestionOption::model()->findAllByAttributes(array("studyId"=>$id));
        foreach($results as $result){
            $options[$result->questionId][$result->ordering] = mToA($result);
        }
        $answers = array();
        $interviewId = false;
        $participantList = array();
        $results = AlterList::model()->findAllByAttributes(array("studyId"=>$id));
        foreach($results as $result){
            if($result->name)
                $participantList['name'][] = $result->name;
            if($result->email)
                $participantList['email'][] = $result->email;
        }
        if(isset($_GET['interviewId'])){
            $interviewId = $_GET['interviewId'];
    		$interviewIds = Interview::multiInterviewIds($_GET['interviewId'], $study);
    		if(is_array($interviewIds)){
    		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interviewIds));
    		}else{
    		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$_GET['interviewId']));
            }
            $alterPrompts = array();
            $results = AlterPrompt::model()->findAllByAttributes(array("studyId"=>$id));
            foreach($results as $result){
                $alterPrompts[$result->afterAltersEntered] = $result->display;
            }
    		foreach($answerList as $answer){
    			if($answer->alterId1 && $answer->alterId2)
    				$array_id = $answer->questionId . "-" . $answer->alterId1 . "and" . $answer->alterId2;
    			else if ($answer->alterId1 && ! $answer->alterId2)
    				$array_id = $answer->questionId . "-" . $answer->alterId1;
    			else
    				$array_id = $answer->questionId;
                $answers[$array_id] = mToA($answer);
    		}
    		$alters = array();
			$criteria = array(
				'condition'=>"FIND_IN_SET(" . $interviewId .", interviewId)",
				'order'=>'ordering',
			);
			$results = Alters::model()->findAll($criteria);
			foreach($results as $result){
    			$alters[$result->id] = mToA($result);
			}
			$graphs = array();
			$results = Graph::model()->findAllByAttributes(array('interviewId'=>$interviewId));
			foreach($results as $result){
    			$graphs[$result->expressionId] = mToA($result);
			}
    		$notes = array();
    		$results = Note::model()->findAllByAttributes(array("interviewId"=>$interviewId));
    		foreach($results as $result){
    			$notes[$result->expressionId][$result->alterId] = $result->notes;
    		}
        }
        $this->render('view', array(
                "study"=>json_encode(mToA($study)),
                "questions"=>json_encode($questions),
                "ego_id_questions"=>json_encode($ego_id_questions),
                "ego_questions"=>json_encode($ego_questions),
                "alter_questions"=>json_encode($alter_questions),
                "alter_pair_questions"=>json_encode($alter_pair_questions),
                "network_questions"=>json_encode($network_questions),
                "no_response_questions"=>json_encode($no_response_questions),
                "expressions"=>json_encode($expressions),
                "options"=>json_encode($options),
                "interviewId" => $interviewId,
                "answers"=>json_encode($answers),
                "alterPrompts"=>json_encode($alterPrompts),
                "alters"=>json_encode($alters),
                "graphs"=>json_encode($graphs),
                "allNotes"=>json_encode($notes),
                "participantList"=>json_encode($participantList),
                "questionList"=>json_encode($study->questionList()),
            )
        );
	}

	public function actionSave()
	{


		foreach($_POST['Answer'] as $Answer){

            $interviewId = $Answer['interviewId'];
            if($interviewId && !isset($answers)){
            	$answers = array();
        		$interviewIds = Interview::multiInterviewIds($interviewId, $study);
        		if(is_array($interviewIds))
        		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interviewIds));
        		else
        		    $answerList = Answer::model()->findAllByAttributes(array('interviewId'=>$interviewId));
        		foreach($answerList as $answer){
        			if($answer->alterId1 && $answer->alterId2)
        				$answers[$answer->questionId . "-" . $answer->alterId1 . "and" . $answer->alterId2] = $answer;
        			else if ($answer->alterId1 && ! $answer->alterId2)
        				$answers[$answer->questionId . "-" . $answer->alterId1] = $answer;
        			else
        				$answers[$answer->questionId] = $answer;
        		}
            }
			if($Answer['questionType'] == "ALTER")
				$array_id = $Answer['questionId'] . "-" . $Answer['alterId1'];
			else if($Answer['questionType'] == "ALTER_PAIR")
				$array_id = $Answer['questionId'] . "-" . $Answer['alterId1'] . "and" . $Answer['alterId2'];
			else
				$array_id = $Answer['questionId'];
					
			if($Answer['questionType'] == "EGO_ID" && $Answer['value'] != "" && !$interviewId){
				if(Yii::app()->user->isGuest){
					foreach($_POST['Answer'] as $ego_id){
						$array_id = $ego_id['questionId'];
						$answers[$array_id] = new Answer;
						$answers[$array_id]->attributes = $ego_id;
						if(stristr(Question::getTitle($ego_id['questionId']), 'email')){
							$email = $ego_id['value'];
							$email_id = $array_id;
						}
					}
					if($key && User::hashPassword($email) != $key){
						$model[$email_id]->addError('value', 'You do not have the correct email for this survey.');
						$errors++;
						break;
					}
				}
				if($errors == 0){
					if(Yii::app()->user->isGuest && isset($email)){
						$interview = Interview::getInterviewFromEmail($_POST['studyId'],$email);
						if($interview){
							$this->redirect(Yii::app()->createUrl(
								'interviewing/'.$study->id.'?'.
								'interviewId='.$interview->id.'&'.
								'page='.($interview->completed).'&key=' . $key
							));
						}
					}
					$interview = new Interview;
					$interview->studyId = $Answer['studyId'];
					if($interview->save()){
						$interviewId = $interview->id;
					}else{
						print_r($interview->errors);
						die();
					}
				}
			}
			if(!isset($answers[$array_id]))
                $answers[$array_id] = new Answer;
			$answers[$array_id]->attributes = $Answer;
			if($interviewId){
				$answers[$array_id]->interviewId = $interviewId;
				$answers[$array_id]->save();
				if(strlen($answers[$array_id]->value) >= 8)
				    $answers[$array_id]->value = decrypt( $answers[$array_id]->value);

			}
        }
		$interview = Interview::model()->findByPk((int)$interviewId);
		if($interview &&$interview->completed != -1 && is_numeric($_POST['page'])){
			$interview->completed = (int)$_POST['page'] + 1;
			$interview->save();
		}
		foreach($answers as $index => $answer){
    		$json[$index] = mToA($answer);
		}
		echo json_encode($json);
        
    }
    
	public function actionAlter(){
		if(isset($_POST['Alters'])){
            #OK FOR SQL INJECTION
            $params = new stdClass();
            $params->name = ':interviewId';
            $params->value = $_POST['Alters']['interviewId'];
            $params->dataType = PDO::PARAM_INT;

			$studyId = q("SELECT studyId FROM interview WHERE id = :interviewId", array($params))->queryScalar();
			$criteria=array(
				'condition'=>"FIND_IN_SET(" . $_POST['Alters']['interviewId'] .", interviewId)",
				'order'=>'ordering',
			);
			$alters = Alters::model()->findAll($criteria);
			$alterNames = array();
			foreach($alters as $alter){
				$alterNames[] = $alter->name;
			}
			$model = new Alters;
			$model->attributes = $_POST['Alters'];
			if(in_array($_POST['Alters']['name'], $alterNames)){
				$model->addError('name', $_POST['Alters']['name']. ' has already been added!');
			}

            #OK FOR SQL INJECTION
			$study = Study::model()->findByPk((int)$studyId);

			// check to see if pre-defined alters exist.  If they do exist, check name against list
			if($study->useAsAlters){
                #OK FOR SQL INJECTION
				$alterCount = q("SELECT count(id) FROM alterList WHERE studyId = ".$studyId)->queryScalar();
				if($alterCount > 0){
                    #OK FOR SQL INJECTION
                    $params = new stdClass();
                    $params->name = ':name';
                    $params->value = $_POST['Alters']['name'];
                    $params->dataType = PDO::PARAM_STR;
					$nameInList = q('SELECT name FROM alterList WHERE name = :name AND studyId = '. $studyId, array($params))->queryScalar();
					if(!$nameInList && $study->restrictAlters){
						$model->addError('name', $_POST['Alters']['name']. ' is not in our list of participants');
					}
				}
			}

            $foundAlter = false;
			if(isset($study->multiSessionEgoId) && $study->multiSessionEgoId){
                #OK FOR SQL INJECTION
                #OK FOR SQL INJECTION
                $multiIds = q("SELECT id FROM question WHERE title = (SELECT title FROM question WHERE id = " . $study->multiSessionEgoId . ")")->queryColumn();
                #OK FOR SQL INJECTION

    			$criteria=array(
    				'condition'=>"interviewId = ". $_POST['Alters']['interviewId']." AND questionId IN (" . implode(",", $multiIds) . ")",
    			);
                $egoValue = Answer::model()->find($criteria);
    			$criteria=array(
    				'condition'=>"questionId IN (" . implode(",", $multiIds) . ")",
    			);

                $otherEgoValues = Answer::model()->findAll($criteria);
                foreach($otherEgoValues as $other){
                    if($other->value == $egoValue->value)
                        $interviewIds[] = $other->interviewId;
                }
				$interviewIds = array_diff(array_unique($interviewIds), array($_POST['Alters']['interviewId']));

                foreach($interviewIds as $iId){
                    $criteria=array(
                        'condition'=>"FIND_IN_SET (" . $iId . ", interviewId) ",
                    );
                    $alters = Alters::model()->findAll($criteria);
                    foreach($alters as $alter){
                        if($alter->name == $_POST['Alters']['name']){
                            $alter->interviewId = $alter->interviewId . ",". $_POST['Alters']['interviewId'];
                            $alter->save();
                            $foundAlter = true;
                        }
                    
                    }
                }
			}
			$criteria=new CDbCriteria;
			$criteria->condition = ('interviewId = '.$_POST['Alters']['interviewId']);
			$criteria->select='count(ordering) AS ordering';
			$row = Alters::model()->find($criteria);
			$model->ordering = $row['ordering'];
			if(!$model->getError('name') && $foundAlter == false)
				$model->save();
			$interviewId = $_POST['Alters']['interviewId'];

			$criteria=new CDbCriteria;
			$criteria=array(
				'condition'=>"afterAltersEntered <= " . Interview::countAlters($interviewId),
				'order'=>'afterAltersEntered DESC',
			);
			$alterPrompt = AlterPrompt::getPrompt($studyId, Interview::countAlters($interviewId));

    		$alters = array();
			$criteria = array(
				'condition'=>"FIND_IN_SET(" . $interviewId .", interviewId)",
				'order'=>'ordering',
			);
			$results = Alters::model()->findAll($criteria);
			foreach($results as $result){
    			$alters[$result->id] = mToA($result);
			}

			echo json_encode($alters);

		}
	}

	public function actionDeletealter()
	{
		if(isset($_POST['Alters'])){
			$model = Alters::model()->findByPk((int)$_POST['Alters']['id']);
			$interviewId = $_POST['Alters']['interviewId'];
			if($model){
				$ordering = $model->ordering;
				if(strstr($model->interviewId, ",")){
					$interviewIds = explode(",", $model->interviewId);
					$interviewIds = array_diff($interviewIds,array($interviewId));
					$model->interviewId = implode(",", $interviewIds);
					$model->save();
				}else{
					$model->delete();
				}
				Alters::sortOrder($ordering, $interviewId);
			}

    		$alters = array();
			$criteria = array(
				'condition'=>"FIND_IN_SET(" . $interviewId .", interviewId)",
				'order'=>'ordering',
			);
			$results = Alters::model()->findAll($criteria);
			foreach($results as $result){
    			$alters[$result->id] = mToA($result);
			}

			echo json_encode($alters);
		}
	}

}