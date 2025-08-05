<?php
namespace Avatar;

use MediaWiki\MediaWikiServices;
use MediaWiki\Html\Html;
use OOUI;


class SpecialView extends \SpecialPage {

	public function __construct() {
		parent::__construct('ViewAvatar');
	}
    public function delAvatarlog($userObj, $opt) {
        global $wgAvatarLogInRC;
        $logEntry = new \ManualLogEntry('avatar', 'delete');
        $logEntry->setPerformer($this->getUser());
        $logEntry->setTarget($userObj->getUserPage());
        $logEntry->setComment($opt->getValue('reason'));
        $logId = $logEntry->insert();
        $logEntry->publish($logId, $wgAvatarLogInRC ? 'rcandudp' : 'udp');
    }
	public function execute($par) {
		OOUI\Theme::setSingleton(new OOUI\WikimediaUITheme);
		OOUI\Element::setDefaultDir('rtl');

		// Shortcut by using $par
		global $wgAvatarEnableS3;
		if ($par) {
			$this->getOutput()->redirect($this->getPageTitle()->getLinkURL(array(
				'user' => $par,
			)));
			return;
		}

		$this->setHeaders();
		$this->outputHeader();

		// Parse options
		$opt = new \FormOptions;
		$opt->add('user', '');
		$opt->add('delete', '');
		$opt->add('reason', '');
		$opt->fetchValuesFromRequest($this->getRequest());

		// Parse user
		$user = $opt->getValue('user');
		$userObj = \User::newFromName($user);
		$userExists = $userObj && $userObj->getId() !== 0;

		// If current task is delete and user is not allowed
		$canDoAdmin = MediaWikiServices::getInstance()->getPermissionManager()->userHasRight($this->getUser(), 'avataradmin');
		if ($opt->getValue('delete')) {
			if (!$canDoAdmin) {
				throw new \PermissionsError('avataradmin');
			}
			// Delete avatar if the user exists
			if ($userExists) {

				function delAvatarlog($thiss, $userObj, $opt) {
					global $wgAvatarLogInRC;
					$logEntry = new \ManualLogEntry('avatar', 'delete');
					$logEntry->setPerformer($thiss->getUser());
					$logEntry->setTarget($userObj->getUserPage());
					$logEntry->setComment($opt->getValue('reason'));
					$logId = $logEntry->insert();
					$logEntry->publish($logId, $wgAvatarLogInRC ? 'rcandudp' : 'udp');
				}
				if (!$wgAvatarEnableS3) {
					if (Avatars::deleteAvatar($userObj)) {
						$this -> delAvatarlog( $userObj, $opt);
					}
				} else {
					$delResults = OSSdispose::deleteOSS($userObj->getId(), true);
					if (!$delResults['code']) {
						$this -> delAvatarlog($userObj, $opt);
					}

				}

			}
		}

		$this->getOutput()->addModules(array('mediawiki.userSuggest'));
		$this->getOutput()->addModules('ext.avatar.view');
		$this->showForm($user);

		if ($userExists) {
			$haveAvatar = Avatars::hasAvatar($userObj);

			if ($haveAvatar) {
				$query = $wgAvatarEnableS3 ? '' : '&nocache&ver=' . dechex(time());
				$src = Avatars::getLinkFor($user, 'original') . $query;
				$html = html::element('img', [
					'src' => $src,
					'style' => 'margin: 1rem 0; width: 100%; max-width: 400px; height: auto;',
				]);
				$html = Html::rawElement('p', [], $html);
				$this->getOutput()->addHTML($html);

				// Add a delete button
				if ($canDoAdmin) {
					$this->showDeleteForm($user);
				}
			} else {
				$this->getOutput()->addWikiMsg('viewavatar-noavatar');
			}
		} else if ($user) {
			$this->getOutput()->addWikiMsg('viewavatar-nouser');
		}
	}

	private function showForm($user) {
		global $wgScript;

		// This is essential as we need to submit the form to this page
		$html = Html::hidden('title', $this->getPageTitle());

		$html .= Html::element('legend', ['style' => 'font-size: 1rem'], $this->msg('viewavatar-legend')->text());

		// Create username input with user suggestion support
		$userNameInput = new OOUI\TextInputWidget([
			'name' => 'user',
			'id' => 'user',
			'class' => 'mw-user-suggest',
			'required' => true,
			'value' => $user,
			'placeholder' => $this->msg('viewavatar-username')->text(),
		]);

		// Create submit button
		$submitBtn = new OOUI\ButtonInputWidget([
			'label' => $this->msg('viewavatar-submit')->text(),
			'type' => 'submit',
			'id' => 'submit',
			'flags' => ['primary', 'progressive'],
		]);

		// Create layout with input field on one line and button on the next
		$userNameField = new OOUI\FieldLayout($userNameInput, [
			'label' => $this->msg('viewavatar-username')->text(),
			'align' => 'top',
			'classes' => ['avatar-max-width-50em']
		]);

		$buttonField = new OOUI\FieldLayout($submitBtn, [
			'align' => 'top',
			'classes' => ['avatar-button-field']
		]);

		$html .= new OOUI\Widget([
			'content' => [
				$userNameField,
				$buttonField
			]
		]);

		// // Fieldset
		$fieldset = Html::rawElement('fieldset', [
			'class' => 'mw-fieldset'
		], $html);
		$customWidget = new OOUI\Widget([
			'content' => [
				new OOUI\HtmlSnippet($fieldset),
			]
		]);
		// // Wrap with a form
		$showForm = new OOUI\FormLayout([
			'action' => $wgScript,
			'method' => 'get',
			'items' => [
				$customWidget,
			],
		]);

		$this->getOutput()->addHTML($showForm);
	}

	private function showDeleteForm($user) {
		global $wgScript;

		// This is essential as we need to submit the form to this page
		$html = \Html::hidden('title', $this->getPageTitle());
		$html .= \Html::hidden('delete', 'true');
		$html .= \Html::hidden('user', $user);

		$html .= Html::element('legend', ['style' => 'font-size: 1rem'], $this->msg('viewavatar-delete-legend')->text());

		// Create reason input
		$reasonInput = new OOUI\TextInputWidget([
			'name' => 'reason',
			'placeholder' => $this->msg('viewavatar-delete-reason')->text(),
		]);

		// Create delete button with red styling
		$deleteBtn = new OOUI\ButtonInputWidget([
			'label' => $this->msg('viewavatar-delete-submit')->text(),
			'type' => 'submit',
			'flags' => ['destructive'],
			'classes' => ['avatar-delete-button'],
		]);

		// Create layout with input field on one line and button on the next
		$reasonField = new OOUI\FieldLayout($reasonInput, [
			'label' => $this->msg('viewavatar-delete-reason')->text(),
			'align' => 'top',
			'classes' => ['avatar-max-width-50em']
		]);

		$buttonField = new OOUI\FieldLayout($deleteBtn, [
			'align' => 'top',
			'classes' => ['avatar-button-field']
		]);

		$html .= new OOUI\Widget([
			'content' => [
				$reasonField,
				$buttonField
			]
		]);

		// // Fieldset
		$fieldset = Html::rawElement('fieldset', [], $html);
		$customWidget = new OOUI\Widget([
			'content' => [
				new OOUI\HtmlSnippet($fieldset),
			]
		]);
		// // Wrap with a form
		$showDeleteForm = new OOUI\FormLayout([
			'action' => $wgScript,
			'method' => 'get',
			'items' => [
				$customWidget,
			],
		]);

		$this->getOutput()->addHTML($showDeleteForm);
	}
}
