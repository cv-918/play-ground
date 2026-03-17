#pragma once
#include "ComponentBase.h"

class Status : public ComponentBase
{
	/*
		Status Component (데이터 센터)
		Level, Exp: 성장에 관련된 핵심 수치.
		Stat: 힘, 민첩, 지능 등 캐릭터의 원본 스탯.
		Name/Title: 캐릭터의 정보.
		하는 일: 경험치가 들어오면 레벨업 로직 처리, 스탯 계산.

		레벨과 경험치 관리 컴포넌트
		레벨업 시스템은 단순히 경험치가 일정 수치 이상이 되면 레벨이 오르는 형태로 구현
		필요에 따라 레벨업 시 추가 효과(예: 능력치 상승, 스킬 획득 등)도 구현 가능
		경험치 요구량은 레벨에 따라 증가하도록 설정 (예: 레벨^2 * 100)
		레벨과 경험치 외에도, 필요에 따라 스탯 포인트, 스킬 포인트 등의 추가 필드를 구현할 수 있음
		경험치 요구량 계산 함수도 포함하여, 레벨업 시 필요한 경험치를 쉽게 확인할 수 있도록 함
		경험치 요구량 계산 예시: ExpToLevelUp() 함수에서 레벨에 따른 경험치 요구량을 반환하도록 구현
		경험치 획득 시, 현재 경험치에 추가하고 레벨업 여부를 체크하는 GainExp() 함수도 구현
		레벨업 시 필요한 경험치 계산 예시
		int ExpToLevelUp() const { return lv_ * lv_ * 100; }
		경험치 획득 및 레벨업 체크 예시
		void GainExp(int exp) {
		 exp_ += exp;
		 while (exp_ >= ExpToLevelUp()) {
			 exp_ -= ExpToLevelUp();
			 ++lv_;
			 // 레벨업 시 추가 효과 처리 (예: 능력치 상승, 스킬 획득 등)
		 }
	*/

public:
	explicit Status() : ComponentBase(ComponentType::Status) {}

public:
	_int GetLv() const { return lv_; }
	void SetLv(const _int _lv) { lv_ = _lv; }

	_int GetExp() const { return exp_; }
	void SetExp(const _int _exp) { exp_ = _exp; }

	_float GetCurrentHp() const { return current_hp_; }
	void SetCurrentHp(const _float _hp);

	_float GetMaxHP() const { return max_hp_; }
	void SetMaxHP(const _float _max_hp) { max_hp_ = _max_hp; }

	_int GetAtt() const { return att_; }
	void SetAtt(const _int _att) { att_ = _att; }

	_bool IsDead() const { return is_dead_; }
	void MarkAsDead() { is_dead_ = true; }

private:
	_int lv_ = 0;
	_int exp_ = 0;

	_float current_hp_ = 0.f;
	_float max_hp_ = 0.f;
	_int att_ = 0;

	_bool is_dead_ = false;
};

