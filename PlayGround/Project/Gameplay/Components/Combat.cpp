#include "framework.h"
#include "Combat.h"

#include "Actors/GameObjectBase.h"
#include "Components/Status.h"

_float Combat::GetDamage(_float _damage, Status* _status)
{
	// 방어 코드: null 포인터인 경우 무시
	if (nullptr == _status)
	{
		_NULL_DETECTION_LOG;
		return 0.f;
	}

	// 방어 코드: 데미지가 음수인 경우 무시
	if (0 > _damage)
	{
		_SYSTEM_LOG_INFO(_T("Combat::GetDamage called with negative damage value: %.2f. Ignoring damage application."), _damage);
		return 0.f;
	}

	const auto curr_hp = _status->HP();

	// 방어 코드: 이미 체력이 0인 경우 무시
	if (0 >= curr_hp)
	{
		_SYSTEM_LOG_INFO(_T("Combat::GetDamage called but target is already at 0 HP. Ignoring damage application."));
		return 0.f;
	}

	// 데미지 계산 코드: 공격력, 방어력, 기타 버프/디버프 등을 고려한 최종 데미지 계산
	// 예시로, 단순히 공격력에서 방어력을 뺀 값을 데미지로 계산한다고 가정
	// 추후에 헬퍼함수로 분리하거나, 데미지 계산 로직을 별도의 시스템으로 옮길 수 있음
	auto input_damage = _damage;
	auto final_damage = input_damage;

	// 체력에서 데미지만큼 감소
	auto new_hp = MathFunctions::Clamp(curr_hp - final_damage, 0.f, curr_hp);
	_status->HP(new_hp);

	// 디버그 로그: 데미지 계산 결과와 적용된 데미지, 체력 변화 등을 로그로 출력
	_SYSTEM_LOG_INFO(_T("Combat::GetDamage applied %.2f damage to [%s]. (HP: %.2f -> %.2f)"), final_damage, gameobject_->Name().c_str(), curr_hp, new_hp);

	// 데미지 폰트 노출을 위해서 최종 데미지 반환
	return final_damage;
}
