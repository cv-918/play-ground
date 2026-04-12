#pragma once

#include "DialogueRunner.h"
#include "DialogueWindowView.h"

class IDialogueEventListener;

/**
 * @brief 외부 게임 코드가 다이얼로그 시스템을 사용하는 진입점 클래스.
 *
 * 책임:
 * - 세션 시작/업데이트/렌더/종료 인터페이스 제공
 * - 고수준 입력 API 제공
 * - 내부 Runner/View 연결
 */
class DialogueSystem
{
public:
    /**
     * @brief 기본 생성자.
     */
    DialogueSystem() = default;

    /**
     * @brief 기본 소멸자.
     */
    virtual ~DialogueSystem() = default;

public:
    /**
     * @brief 새로운 세션을 시작한다.
     */
    [[nodiscard]] bool StartSession(const DialogueSessionData& _session_data, IDialogueEventListener* _event_listener);

    /**
     * @brief 현재 세션을 강제 중단한다.
     */
    void AbortSession();

    /**
     * @brief 시스템을 업데이트한다.
     */
    void Update(float _delta_time);

    /**
     * @brief 시스템을 렌더링한다.
     */
    void Render() const;

public:
    /**
     * @brief 현재 상태에 맞는 confirm 동작을 수행한다.
     */
    void OnConfirmInput();

    /**
     * @brief confirm 입력 홀드 시간을 받아 세션 스킵 여부를 판단한다.
     */
    void UpdateSkipHold(float _hold_seconds);

    /**
     * @brief 세션 스킵 입력을 처리한다.
     */
    void OnSkipSessionInput();

    /**
     * @brief 선택지 위 이동 입력을 처리한다.
     */
    void OnChoiceUpInput();

    /**
     * @brief 선택지 아래 이동 입력을 처리한다.
     */
    void OnChoiceDownInput();

public:
    /**
     * @brief 저수준 API: 타이핑 완료 입력을 직접 전달한다.
     */
    void OnTypingCompleteInput();

    /**
     * @brief 저수준 API: 다음 진행 입력을 직접 전달한다.
     */
    void OnNextInput();

    /**
     * @brief 저수준 API: 선택지 확정 입력을 직접 전달한다.
     */
    void OnChoiceConfirmInput();

public:
    /**
     * @brief 현재 세션이 Running 상태인지 반환한다.
     */
    [[nodiscard]] bool IsRunning() const;

    /**
     * @brief 최근 세션이 Finished 상태인지 반환한다.
     */
    [[nodiscard]] bool HasFinishedSession() const;

    /**
     * @brief 현재 세션이 게임 입력을 점유 중인지 반환한다.
     */
    [[nodiscard]] bool IsBlockingGameInput() const;

    /**
     * @brief 최근 세션 결과를 반환한다.
     */
    [[nodiscard]] const DialogueSessionResult& GetLastSessionResult() const;

    /**
     * @brief Finished 상태를 정리한다.
     */
    void ClearFinishedState();

private:
    DialogueRunner runner_;
    DialogueWindowView view_;

    bool skip_hold_triggered_ = false;
};