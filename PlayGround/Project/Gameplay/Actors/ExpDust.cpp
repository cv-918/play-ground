#include "framework.h"
#include "ExpDust.h"

#include "EngineSystems/Physics/CollisionManager.h"

#include "Components/Transform.h"
#include "Components/Status.h"
#include "Components/NonPlayableMovement.h"
#include "Components/SphereCollider.h"
#include "Components/Combat.h"

#include "GamePlaySystems/StageManager.h"
#include "GamePlaySystems/GameState.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 더스트 identifier 설정
	static _int instance_count = 0;
	Name(_T("ExpDust") + std::to_wstring(++instance_count));

	// 더스트 초기값 설정
	
	// 랜덤 색상 설정
	// RGB(100~255 범위의 랜덤한 색상)
	// 추후에는 레벨에 따른 색상 범위 설정도 고려
	const _int color_range_min = 100;
	const _int color_range_max = 255;
	color_brush_ = CreateSolidBrush(RGB(
		_Random.Range(color_range_min, color_range_max),
		_Random.Range(color_range_min, color_range_max),
		_Random.Range(color_range_min, color_range_max)
	));

	const auto lv = _Random.Range(1, 5);

	// movement
	MovementPattern pattern = MovementPattern::Undefined;
	_float move_spd = 0.f;

	// transform
	_float scale = 0.f;
	_Vector3 position;
	_int position_clampper = 0;
	_int position_padding_x = _Random.Range(0, 50); // for moving patterns
	_int position_padding_y = _Random.Range(0, 50); // for moving patterns
	_Vector3 look_point;
	
	// 무브먼트 타입 설정해서 가속도 로직으로 이동할지 일반 로직으로 이동할지 선택
	switch (s_cast(DustGrade, lv))
	{
	case DustGrade::One:
		pattern = MovementPattern::Stopped;
		move_spd = 0.f;

		scale = 10.f;
		position_clampper = (s_int(scale) >> 1);
		break;
	case DustGrade::Two:
		pattern = MovementPattern::Directional;
		move_spd = 80.f;

		scale = 10.f;
		position_clampper = (s_int(scale) >> 1);
		break;
	case DustGrade::Three:
		pattern = MovementPattern::ToTarget;
		move_spd = 60.f;

		scale = 30.f;
		position_clampper = (s_int(scale) >> 1);
		break;
	case DustGrade::Four:
		pattern = MovementPattern::Stopped;
		move_spd = 0.f;

		scale = 50.f;
		position_clampper = (s_int(scale) >> 1);
		break;
	case DustGrade::Five:
		pattern = MovementPattern::Directional;
		move_spd = 40.f;

		scale = 80.f;
		position_clampper = (s_int(scale) >> 1);
		break;
	default:
		break;
	}

	switch (pattern)
	{
	case MovementPattern::Stopped:
	{
		position.x = _Random.Range(INGAVE_FRAME_THICKNESS_HALF + position_clampper,
			WINCX - INGAVE_FRAME_THICKNESS_HALF - position_clampper);
		position.y = _Random.Range(INGAVE_FRAME_THICKNESS_HALF + position_clampper,
			WINCY - INGAVE_FRAME_THICKNESS_HALF - position_clampper);
	}
	break;

	case MovementPattern::Directional:
	case MovementPattern::ToTarget:
	{
		_Point generated_position = _StageMgr.GeneratePosition(STAGE_PLAY_STATE::Ready == _StageMgr.State());

		/*
			중점에서 생성 위치를 빼면 방향 벡터(v)가 나온다
			생성 위치를 v 방향으로 radius 만큼 이동시킨 위치가 화면 안에 있을 경우,
			반대 방향으로 '얼마만큼 -radius만큼?-' 밀어낸다.
		*/

		//const auto& generated_position = _StageMgr.GeneratePosition(false);

		_Vector3 center = _Vector3(WIN_CENTER_X, WIN_CENTER_Y);
		const auto to_center = (center - generated_position).Normalized();
		position = to_center * position_clampper;

		const auto& nav_mesh = _StageMgr.GetNavMesh();
		if (nav_mesh.PtInRect(position))
		{
			position = to_center * (position_clampper * -1.f);
		}

		// 이 영역을 랜덤하게 바라보게끔 한다
		const auto& look_target_area = nav_mesh * 0.75f;
		look_point = { _Random.Range(look_target_area.Left(), look_target_area.Right()),
			_Random.Range(look_target_area.Top(), look_target_area.Bottom()) };
	}
	break;
		//// 스테이지가 준비 중이라면 화면 내부 + 외부 생성
		//if (STAGE_PLAY_STATE::Ready == _StageMgr.State())
		//{
		//	const auto& generated_position = _StageMgr.GeneratePosition(true);
		//	// 
		//	//position.x = ;
		//}
		//// 스테이지가 진행 중이라면 외부 생성
		//else
		//{
		//	/*
		//		중점에서 생성 위치를 빼면 방향 벡터(v)가 나온다
		//		생성 위치를 v 방향으로 radius 만큼 이동시킨 위치가 화면 안에 있을 경우,
		//		반대 방향으로 '얼마만큼 -radius만큼?-' 밀어낸다.
		//	*/
		//	const auto& generated_position = _StageMgr.GeneratePosition(false);

		//	_Vector3 center = _Vector3(WIN_CENTER_X, WIN_CENTER_Y);
		//	const auto to_center = (center - generated_position).Normalized();
		//	position = to_center * position_clampper;

		//	const auto& nav_mesh = _StageMgr.GetNavMesh();
		//	if (nav_mesh.PtInRect(position))
		//	{
		//		position = to_center * -position_clampper;
		//	}
		//}
		//break;
	}

	// s, [ 더스트 컴포넌트 설정 ]
	/*
		#1. 초기 SRT(Scale, Rotation, Translation) 설정
		- 트랜스폼 및 무브먼트 컴포넌트에 대한 설정

		* 크기 : 레벨 분기
		* 위치 : 이동 타입(레벨에 의해 분기)에 따라
				 -> Stopped 인 경우 무조건 화면 내부에 생성해야함
				 -> Directional | ToTarget 일 경우 스폰 가능한 전체 영역
				 -> 스테이지 이동에 의한 초기 생성인지 스테이지 진행 중의 지속 생성인지에 따라서 스폰 영역 변경되어야 함
				 
		* 회전 : 레벨(이동 타입) 및 초기 생성 위치에 따라서
	*/

	transform_->Scale(scale);
	transform_->Position(position);
	transform_->LookAt(look_point);
	
	_float radius = scale * 0.5f;
	collider_ = new SphereCollider(radius);
	collider_->Draw(false);

	movement_ = new NonPlayableMovement();
	movement_->Pattern(pattern);
	movement_->MoveSpd(move_spd);
	if (lv == 3)
	{
 		s_cast(NonPlayableMovement*, movement_)->Target(_GameState.Player());
	}

	const auto move_dir = (look_point - position).Normalized();
	movement_->MoveDir(move_dir);
	RegisterComponent(movement_);

	/*
		#2. 공격 패턴 설정
		- 컴뱃 및 스테이터스 컴포넌트에 대한 설정
		공격 패턴이 있는 레벨의 경우 공격 패턴 설정
	*/

	combat_ = new Combat();
	status_ = new Status();
	status_->Level(lv);

	RegisterComponent(collider_);
	_ColMgr.RegisterCollider(CollisionLayer::ExpDust, collider_);
	// e, [ 더스트 컴포넌트 설정 ]

	Finalize();

	return true;
}

_int ExpDust::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;

	return 0;
}

void ExpDust::Render(_double _delta_time)
{
	if(!Visible())
		return;

	__super::Render(_delta_time);

	HBRUSH oldBrush = (HBRUSH)SelectObject(g_back_dc, color_brush_);

	const auto pos = transform_->Position();
	const _int rt_size = transform_->Scale().Length();

	RECT rt = {
		pos.x - rt_size,
		pos.y - rt_size,
		pos.x + rt_size,
		pos.y + rt_size
	};

	Ellipse(g_back_dc, rt.left, rt.top, rt.right, rt.bottom);
	SelectObject(g_back_dc, oldBrush);
}

void ExpDust::DebugRender(_double _delta_time)
{
	__super::DebugRender(_delta_time);

	// s, 방향 그려서 회전이 적용되는지 확인
	const auto position = transform_->Position();

	auto forward = transform_->Forward2D();
	const float line_length = 75.f;
	forward *= line_length;
	forward += position;

	MoveToEx(g_back_dc, s_int(position.x), s_int(position.y), nullptr);
	LineTo(g_back_dc, s_int(forward.x), s_int(forward.y));
	// s, 방향 그려서 회전이 적용되는지 확인

	// 1. 배경 모드를 투명(TRANSPARENT)으로 설정
	int oldMode = SetBkMode(g_back_dc, TRANSPARENT);

	const auto pos = transform_->Position();
	const auto rt_size = 150;
	const auto half_size = rt_size >> 1;

	RECT rt;
	rt.left = pos.x - half_size;
	rt.top = pos.y - half_size + 14;
	rt.right = pos.x + half_size;
	rt.bottom = pos.y + half_size + 14;

	// s, 오브젝트 이름 그리기
	const auto debug_string_level = std::wstring(_T("(Lv : ")) + std::to_wstring(status_->Level()) + std::wstring(_T(")"));
	DrawText(g_back_dc, debug_string_level.c_str(), debug_string_level.length(), &rt, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
	// e, 오브젝트 이름 그리기

	// 3. (선택 사항) 다음 그림을 위해 이전 모드로 복구
	SetBkMode(g_back_dc, oldMode);
}

void ExpDust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
		if (status_->Level() >= 4)
		{
			const auto player = _other->GameObject();

			// 플레이어의 Combat 컴포넌트에서 GetDamage() 호출해서 데미지 입히기
			const auto com_combat = player->GetComponent(ComponentType::Combat);
			s_cast(Combat*, com_combat)->GetDamage(1);

			// 공격속도 고정값 일단은 여기에 지역변수로 하드코딩
			const _double attack_speed = 4.f;

			// 플레이어에 대한 충돌 기록 저장
			_this->SetTimerForTarget(_other, attack_speed);
		}
		break;
	}
}

void ExpDust::OnCollisionStay(Collider* _this, Collider* _other)
{
}

void ExpDust::OnCollisionExit(Collider* _this, Collider* _other)
{
}

void ExpDust::GetDamage(_float _damage)
{

}

void ExpDust::AdjustColliderRadius()
{
	if (collider_)
	{
		collider_->Radius(transform_->Scale().Length());
	}
}
