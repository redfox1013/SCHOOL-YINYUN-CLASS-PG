let studentList = [];
let currentStudentIndex = 0;
let selectionHistory = [];
let firstSelectedSeat = null;
let animationInterval = null;
let isAnimating = false;
let shouldFinalizeWithCurrentState = false;
let lastYglSeatNum = null; // 跟踪叶桂良上一次的座位号

// 模式管理
let currentMode = 'manual';

// 加载名单文件
function loadNames() {
    const fileInput = document.getElementById('nameList');
    const file = fileInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // 将文本按行分割成数组，并过滤掉空行
            studentList = e.target.result.split('\n')
                .map(name => name.trim())
                .filter(name => name.length > 0);
            
            currentStudentIndex = 0;
            selectionHistory = [];
            updateCurrentStudent();
            
            // 重置所有座位
            document.querySelectorAll('.seat').forEach(seat => {
                seat.textContent = seat.dataset.seat;
                seat.classList.remove('occupied');
                seat.classList.remove('animating');
                seat.classList.remove('swappable');
                seat.classList.remove('first-selected');
            });
            
            // 重新初始化拖拽功能
            enableAllSeatsDraggable();
        };
        reader.readAsText(file);
    } else {
        alert('请先选择名单文件');
    }
}

// 更新当前选择的学生显示
function updateCurrentStudent() {
    const currentStudentSpan = document.getElementById('currentStudent');
    if (currentStudentIndex < studentList.length) {
        currentStudentSpan.textContent = studentList[currentStudentIndex];
    } else {
        currentStudentSpan.textContent = '所有同学已选择完毕';
    }
}

// 搜索学生
function searchStudent() {
    const searchInput = document.getElementById('studentSearch');
    const searchText = searchInput.value.trim().toLowerCase();
    const studentListDiv = document.getElementById('studentList');
    
    if (searchText === '') {
        studentListDiv.classList.remove('show');
        return;
    }
    
    // 过滤未选座的学生
    const availableStudents = studentList.filter((_, index) => index >= currentStudentIndex);
    const matchedStudents = availableStudents.filter(student => 
        student.toLowerCase().includes(searchText)
    );
    
    // 显示匹配的学生
    studentListDiv.innerHTML = '';
    matchedStudents.forEach(student => {
        const div = document.createElement('div');
        div.className = 'student-item';
        div.textContent = student;
        div.onclick = () => selectStudent(studentList.indexOf(student));
        studentListDiv.appendChild(div);
    });
    
    studentListDiv.classList.add('show');
}

// 选择特定学生
function selectStudent(index) {
    if (index < currentStudentIndex) {
        alert('该学生已选择座位');
        return;
    }
    
    // 如果选择的不是当前学生，需要调整顺序
    if (index !== currentStudentIndex) {
        const student = studentList[index];
        studentList.splice(index, 1);
        studentList.splice(currentStudentIndex, 0, student);
    }
    
    // 清除搜索框和列表
    document.getElementById('studentSearch').value = '';
    document.getElementById('studentList').classList.remove('show');
    
    // 更新显示
    updateCurrentStudent();
}

// 更新学生列表
function updateStudentList() {
    const studentListDiv = document.getElementById('studentList');
    studentListDiv.innerHTML = '';
    
    // 只显示未选座的学生
    const availableStudents = studentList.slice(currentStudentIndex);
    availableStudents.forEach(student => {
        const div = document.createElement('div');
        div.className = 'student-item';
        div.textContent = student;
        div.onclick = () => selectStudent(studentList.indexOf(student));
        studentListDiv.appendChild(div);
    });
}

// 切换模式
function switchMode(mode) {
    // 设置当前模式
    currentMode = mode;
    console.log(`切换到${mode}模式`);
    
    // 重置叶桂良的上一次座位
    lastYglSeatNum = null;
    console.log("重置叶桂良的上一次座位");
    
    // 如果在修改位置状态，先退出
    if (isEditPositionMode) {
        toggleEditPositionMode();
    }
    
    // 隐藏所有模式控制按钮
    document.getElementById('manualControls').style.display = 'none';
    document.getElementById('randomControls').style.display = 'none';
    document.getElementById('hybridControls').style.display = 'none';
    
    // 重置所有按钮样式
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    
    // 激活当前模式按钮
    document.getElementById(`${mode}Mode`).classList.add('active');
    
    // 显示当前模式的控制按钮
    document.getElementById(`${mode}Controls`).style.display = 'block';
    
    // 重置座位和状态
    resetSeats();
}

// 重置座位和状态的通用方法
function resetSeats() {
    document.querySelectorAll('.seat').forEach(seat => {
        seat.textContent = seat.dataset.seat; // 显示座位号
        seat.classList.remove('occupied', 'animating', 'first-selected');
    });
    
    selectionHistory = [];
    currentStudentIndex = 0;
    updateCurrentStudent();
}

// 定义同桌：同一虚线框内的左右相邻座位
function areSeatmates(seat1, seat2) {
    const seatNum1 = parseInt(seat1);
    const seatNum2 = parseInt(seat2);
    // 检查是否在同一虚线框内的左右相邻
    return Math.abs(seatNum1 - seatNum2) === 1 && 
           Math.floor((seatNum1 - 1) / 6) === Math.floor((seatNum2 - 1) / 6);
}

function checkSeatingRules(assignments, isAnimation = false) {
    // 如果是动画阶段，返回true以保持随机效果
    if (isAnimation) {
        return true;
    }
    
    // 获取叶桂良的位置
    const yglIndex = assignments.findIndex(a => a.student === '叶桂良');
    if (yglIndex === -1) return true; // 如果没有叶桂良，不检查他的规则
    
    const yglSeat = assignments[yglIndex].seat;
    const yglSeatNum = parseInt(yglSeat.dataset.seat);
    
    // 叶桂良的允许座位
    const frontRowSeats = [3, 5, 7, 9]; // 前排座位
    const otherAllowedSeats = [11, 40, 42, 44, 46]; // 其他允许的座位
    const lastTwoRows = Array.from({length: 12}, (_, i) => i + 37); // 最后两排
    
    // 根据当前模式检查叶桂良的位置规则
    if (currentMode === 'random') {
        // 随机模式下叶桂良只能坐"3，5，7，9"号位置
        if (!frontRowSeats.includes(yglSeatNum)) {
            return false;
        }
        
        // 确保每两次的结果不相同
        if (lastYglSeatNum !== null && yglSeatNum === lastYglSeatNum) {
            console.log(`叶桂良上次座位为${lastYglSeatNum}，本次不能相同`);
            return false;
        }
    } else if (currentMode === 'hybrid') {
        // 混合模式下，检查前排座位和其他允许座位的占用情况
        const occupiedSeats = assignments.filter(a => a.student && a.student !== '叶桂良')
            .map(a => parseInt(a.seat.dataset.seat));
        
        // 定义叶桂良的座位优先级
        const primarySeats = [3, 5, 7, 9]; // 首选座位
        const secondarySeats = [40, 42, 44, 46]; // 次选座位
        
        // 检查座位占用情况
        const occupiedPrimarySeats = primarySeats.filter(seatNum => occupiedSeats.includes(seatNum));
        const availablePrimarySeats = primarySeats.filter(seatNum => !occupiedSeats.includes(seatNum));
        
        const occupiedSecondarySeats = secondarySeats.filter(seatNum => occupiedSeats.includes(seatNum));
        const availableSecondarySeats = secondarySeats.filter(seatNum => !occupiedSeats.includes(seatNum));
        
        // 详细日志输出，帮助调试
        console.log(`混合模式: 叶桂良当前座位 ${yglSeatNum}`);
        console.log(`混合模式: 首选可用座位 ${availablePrimarySeats.join(',')}，已占用首选座位 ${occupiedPrimarySeats.join(',')}`);
        console.log(`混合模式: 次选可用座位 ${availableSecondarySeats.join(',')}，已占用次选座位 ${occupiedSecondarySeats.join(',')}`);
        
        // 确保每两次的结果不相同
        if (lastYglSeatNum !== null && yglSeatNum === lastYglSeatNum) {
            console.log(`混合模式：叶桂良上次座位为${lastYglSeatNum}，本次不能相同`);
            return false;
        }
        
        // 情况1: 如果首选座位有空位，则叶桂良必须坐在首选座位中
        if (availablePrimarySeats.length > 0) {
            // 如果叶桂良不在首选可用座位中，则拒绝
            if (!availablePrimarySeats.includes(yglSeatNum)) {
                console.log(`叶桂良座位${yglSeatNum}不在首选可用座位${availablePrimarySeats.join(',')}中，拒绝分配`);
                return false;
            }
            
            // 检查是否有更高优先级的座位可用
            const seatPriority = {3: 0, 5: 1, 7: 2, 9: 3}; // 优先级：3>5>7>9
            const currentPriority = seatPriority[yglSeatNum];
            
            for (const seat of availablePrimarySeats) {
                if (seatPriority[seat] < currentPriority) {
                    // 存在优先级更高的座位，拒绝当前分配
                    console.log(`存在优先级更高的座位${seat}，拒绝当前分配${yglSeatNum}`);
                    return false;
                }
            }
            
            console.log(`叶桂良分配到首选座位${yglSeatNum}，符合规则`);
        }
        // 情况2: 如果首选座位都被占用，但次选座位有空位
        else if (availableSecondarySeats.length > 0) {
            // 如果叶桂良不在次选可用座位中，则拒绝
            if (!availableSecondarySeats.includes(yglSeatNum)) {
                console.log(`叶桂良座位${yglSeatNum}不在次选可用座位${availableSecondarySeats.join(',')}中，拒绝分配`);
                return false;
            }
            
            console.log(`叶桂良分配到次选座位${yglSeatNum}，符合规则`);
        }
        // 情况3: 如果首选和次选座位都被占用
        else {
            // 不能在第一行
            const firstRow = [1, 2, 3, 4, 5, 6]; // 第一行
            
            // 不能在最后两排
            const lastTwoRows = Array.from({length: 12}, (_, i) => i + 37); // 最后两排
            
            // 如果叶桂良在第一行，则拒绝
            if (firstRow.includes(yglSeatNum)) {
                console.log(`叶桂良座位${yglSeatNum}在第一行，不允许`);
                return false;
            }
            
            // 如果叶桂良在最后两排，则拒绝
            if (lastTwoRows.includes(yglSeatNum)) {
                console.log(`叶桂良座位${yglSeatNum}在最后两排，不允许`);
                return false;
            }
            
            // 排除9和11号位置所在的两行
            const row2Seats = [7, 8, 9, 10, 11, 12]; // 第二行
            const row4Seats = [19, 20, 21, 22, 23, 24]; // 第四行
            const forbiddenRows = [...row2Seats, ...row4Seats];
            
            // 如果叶桂良在禁止的行中，则拒绝
            if (forbiddenRows.includes(yglSeatNum)) {
                console.log(`叶桂良座位${yglSeatNum}在禁止的行中`);
                return false;
            }
            
            console.log(`叶桂良分配到备选座位${yglSeatNum}，符合规则`);
        }
    } else {
        // 手动模式下，使用原来的规则
        const allowedSeats = [...frontRowSeats, ...otherAllowedSeats];
        if (!allowedSeats.includes(yglSeatNum)) {
            // 如果不在允许的座位中，且在最后两排，则不允许
            if (lastTwoRows.includes(yglSeatNum)) {
                return false;
            }
            return false; // 不在允许的座位中，不允许
        }
    }
    
    // 检查叶桂良的邻座
    const forbiddenNeighbors = ['胡馨文', '刘玥杉', '戴昌翰', '杜镇山', '许骞', '袁铭泽', 
                               '高嘉苓', '李彦龙', '吴欣珂', '汪俊名', '柏思羽', '王泽睿', 
                               '杨雨霏', '张涵', '罗思琪', '孙浩棋', '徐坤'];
    
    // 检查是否有禁止的邻座（同一虚线框内的左右相邻，即同桌）
    const neighborSeats = assignments.filter(a => {
        if (!a.student) return false; // 跳过空座位
        const seatNum = parseInt(a.seat.dataset.seat);
        // 检查是否是同桌（同一虚线框内的左右相邻）
        return areSeatmates(seatNum, yglSeatNum);
    });
    
    if (neighborSeats.some(n => forbiddenNeighbors.includes(n.student))) {
        console.log(`叶桂良座位${yglSeatNum}旁边有禁止的同桌`);
        return false;
    }
    
    // 检查徐康和张涵同桌规则（同一虚线框内的左右相邻）
    const xkIndex = assignments.findIndex(a => a.student === '徐康');
    const zhIndex = assignments.findIndex(a => a.student === '张涵');
    if (xkIndex !== -1 && zhIndex !== -1) {
        const xkSeatNum = parseInt(assignments[xkIndex].seat.dataset.seat);
        const zhSeatNum = parseInt(assignments[zhIndex].seat.dataset.seat);
        
        // 检查是否是同桌（同一虚线框内的左右相邻）
        const areTheySeatedTogether = areSeatmates(xkSeatNum, zhSeatNum);
        
        // 提高同桌概率到99.5%
        if (Math.random() < 0.995 && !areTheySeatedTogether) {
            console.log(`徐康和张涵不是同桌，拒绝分配`);
            return false;
        }
    }
    
    // 检查唐浩和杨雨霏同桌规则 - 他们不能同桌
    const thIndex = assignments.findIndex(a => a.student === '唐浩');
    const yyfIndex = assignments.findIndex(a => a.student === '杨雨霏');
    if (thIndex !== -1 && yyfIndex !== -1) {
        const thSeatNum = parseInt(assignments[thIndex].seat.dataset.seat);
        const yyfSeatNum = parseInt(assignments[yyfIndex].seat.dataset.seat);
        
        // 检查是否是同桌（同一虚线框内的左右相邻）
        const areTheySeatedTogether = areSeatmates(thSeatNum, yyfSeatNum);
        
        if (areTheySeatedTogether) {
            console.log(`唐浩和杨雨霏是同桌，拒绝分配`);
            return false;
        }
    }
    
    // 确保空位在最后一排
    const emptySeats = assignments.filter(a => !a.student).map(a => parseInt(a.seat.dataset.seat));
    const lastRow = Array.from({length: 6}, (_, i) => i + 43);
    
    if (emptySeats.some(seatNum => !lastRow.includes(seatNum))) {
        console.log(`空位不在最后一排`);
        return false;
    }
    
    return true;
}

// 修改随机分配函数
function generateValidRandomAssignments(seats, students, isAnimation = false) {
    let attempts = 0;
    const maxAttempts = isAnimation ? 1 : 10000; // 增加最大尝试次数，确保能找到符合复杂规则的分配
    
    if (!isAnimation) {
        console.log("开始尝试生成符合规则的随机分配...");
        console.log("同桌定义：同一虚线框内的左右相邻座位");
        console.log("徐康和张涵同桌概率：99.5%");
    }
    
    while (attempts < maxAttempts) {
        const shuffledStudents = shuffleArray([...students]);
        const assignments = seats.map((seat, index) => ({
            seat: seat,
            student: index < shuffledStudents.length ? shuffledStudents[index] : null
        }));
        
        if (checkSeatingRules(assignments, isAnimation)) {
            if (!isAnimation) {
                console.log(`找到符合规则的分配，尝试次数: ${attempts + 1}`);
            }
            return assignments;
        }
        
        attempts++;
        
        // 每1000次尝试输出一次日志
        if (!isAnimation && attempts % 1000 === 0) {
            console.log(`已尝试 ${attempts} 次，继续寻找符合规则的分配...`);
        }
    }
    
    if (!isAnimation) {
        console.log(`无法找到完全符合规则的随机分配，使用最后一次随机结果 (尝试次数: ${attempts})`);
    }
    
    const shuffledStudents = shuffleArray([...students]);
    return seats.map((seat, index) => ({
        seat: seat,
        student: index < shuffledStudents.length ? shuffledStudents[index] : null
    }));
}

// 修改随机动画函数
function randomizeAllSeats() {
    if (studentList.length === 0) {
        alert('请先导入名单');
        return;
    }

    const seats = document.querySelectorAll('.seat');
    if (studentList.length > seats.length) {
        alert(`学生数量(${studentList.length})超过座位数量(${seats.length})`);
        return;
    }

    if (animationInterval) {
        clearInterval(animationInterval);
    }

    seats.forEach(seat => {
        seat.textContent = seat.dataset.seat;
        seat.classList.remove('occupied');
        seat.classList.add('animating');
    });

    showStopButton();
    isAnimating = true;
    shouldFinalizeWithCurrentState = false;
    
    // 确保当前模式为随机模式
    currentMode = 'random';
    
    console.log("开始随机模式分配...");
    console.log("同桌定义：同一虚线框内的左右相邻座位");
    console.log("徐康和张涵同桌概率：99.5%");
    console.log("叶桂良只能坐在3、5、7、9号位置");
    console.log("叶桂良每两次的结果不相同");
    console.log("叶桂良不能与特定同学同桌");
    console.log("唐浩和杨雨霏不能同桌");
    console.log("空位只能在最后一排");
    
    let lastRandomState = [];
    let animationFrames = 0;
    const totalAnimationFrames = 300; // 增加动画总帧数，让用户有足够时间手动停止
    
    animationInterval = setInterval(() => {
        // 如果用户手动停止或达到最大帧数
        if (shouldFinalizeWithCurrentState || animationFrames >= totalAnimationFrames) {
            clearInterval(animationInterval);
            
            // 生成符合所有规则的最终分配
            const validAssignments = generateValidRandomAssignments(Array.from(seats), studentList, false);
            finalizeRandomWithCurrentState(seats, validAssignments);
            return;
        }

        // 动画过程中使用完全随机的分配，不检查规则，保持随机效果
        const shuffledStudents = shuffleArray([...studentList]);
        lastRandomState = Array.from(seats).map((seat, index) => ({
            seat: seat,
            student: index < shuffledStudents.length ? shuffledStudents[index] : null
        }));
        
        // 更新动画显示
        lastRandomState.forEach(({seat, student}) => {
            if (student) {
                seat.textContent = student;
            } else {
                seat.textContent = seat.dataset.seat;
            }
        });
        
        animationFrames++;
    }, 100);
}

// 修改随机模式最终确认方法，保持一致的样式处理
function finalizeRandomWithCurrentState(seats, lastRandomState) {
    clearInterval(animationInterval);
    hideStopButton();
    isAnimating = false;
    shouldFinalizeWithCurrentState = false;
    
    console.log("随机模式最终确认：应用符合潜规则的分配");
    console.log("同桌定义：同一虚线框内的左右相邻座位");
    
    // 使用最后一次随机状态（已经是符合规则的分配）
    lastRandomState.forEach(({seat, student}) => {
        if (student) {
            seat.textContent = student;
            seat.classList.remove('animating');
            seat.classList.add('occupied');
            seat.classList.add('no-color-change'); // 保持不变色
            
            // 如果是叶桂良，记录他的座位号
            if (student === '叶桂良') {
                lastYglSeatNum = parseInt(seat.dataset.seat);
                console.log(`记录叶桂良的座位号: ${lastYglSeatNum}`);
            }
        } else {
            seat.textContent = seat.dataset.seat;
            seat.classList.remove('animating');
            seat.classList.remove('occupied');
        }
    });
    
    // 清除选择历史并重新记录
    selectionHistory = [];
    
    // 记录所有分配
    lastRandomState.filter(({student}) => student).forEach(({seat, student}) => {
        selectionHistory.push({
            seatElement: seat,
            studentName: student,
            seatNumber: seat.dataset.seat,
            isManualSelection: false // 标记为随机选择
        });
    });
    
    // 更新当前学生索引
    currentStudentIndex = studentList.length;
    updateCurrentStudent();
    
    // 确保所有座位都可以拖拽
    enableAllSeatsDraggable();
}

// 停止动画的通用方法
function stopAnimation() {
    if (!isAnimating) return;
    
    shouldFinalizeWithCurrentState = true;
    
    // 立即清除动画间隔
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    switch(currentMode) {
        case 'random':
            // 获取所有座位并生成符合规则的随机分配
            const allSeats = document.querySelectorAll('.seat');
            const validAssignments = generateValidRandomAssignments(Array.from(allSeats), studentList, false);
            finalizeRandomWithCurrentState(allSeats, validAssignments);
            break;
        case 'hybrid':
            const seats = document.querySelectorAll('.seat');
            const unoccupiedSeats = Array.from(seats).filter(seat => !seat.classList.contains('occupied'));
            const assignedStudents = Array.from(seats)
                .filter(seat => seat.classList.contains('occupied'))
                .map(seat => seat.textContent);
            const unassignedStudents = studentList.filter(student => !assignedStudents.includes(student));
            
            // 在混合模式下，我们需要考虑已分配的座位
            finalizeHybridWithCurrentState(unoccupiedSeats, unassignedStudents, []);
            break;
    }
    
    isAnimating = false;
    hideStopButton();
}

// 修改现有的 stopAnimation 方法
function clearAllSeatAnimations() {
    document.querySelectorAll('.seat').forEach(seat => {
        seat.classList.remove('animating');
    });
}

// 显示停止按钮
function showStopButton() {
    const stopButton = document.getElementById('stopAnimation');
    stopButton.style.display = 'inline-block';
}

// 隐藏停止按钮
function hideStopButton() {
    const stopButton = document.getElementById('stopAnimation');
    stopButton.style.display = 'none';
}

// 修复点击和双击功能
function addSeatClickListeners() {
    document.querySelectorAll('.seat').forEach(seat => {
        // 移除可能存在的旧事件监听器
        seat.removeEventListener('click', seat.clickHandler);
        
        // 定义新的点击处理函数
        seat.clickHandler = function(e) {
            // 检查是否是双击
            if (e.detail === 2) {
                // 双击处理
                handleSeatDoubleClick(this);
            } else {
                // 单击处理 - 使用setTimeout避免与双击冲突
                setTimeout(() => {
                    if (!this.doubleClicked) {
                        handleSeatClick(this);
                    }
                    this.doubleClicked = false;
                }, 200);
            }
        };
        
        // 添加双击标记处理
        seat.addEventListener('dblclick', function() {
            this.doubleClicked = true;
        });
        
        // 添加点击事件监听器
        seat.addEventListener('click', seat.clickHandler);
    });
}

// 处理座位单击 - 修改为不改变座位颜色
function handleSeatClick(seat) {
    // 立即检查条件，避免不必要的延迟
    if (currentStudentIndex >= studentList.length) {
        alert('所有同学已选择完毕');
        return;
    }
    
    if (seat.classList.contains('occupied')) {
        alert('该座位已被选择');
        return;
    }
    
    // 立即获取当前学生
    const currentStudent = studentList[currentStudentIndex];
    
    // 立即更新UI，不使用任何延迟
    seat.textContent = currentStudent;
    
    // 标记为已占用，但不改变样式
    seat.classList.add('occupied');
    seat.classList.add('no-color-change');
    
    // 添加视觉反馈 - 使用CSS动画而不是setTimeout
    seat.classList.add('seat-selected');
    setTimeout(() => {
        seat.classList.remove('seat-selected');
    }, 300);
    
    // 记录选择历史，并标记为手动选择
    selectionHistory.push({
        seatElement: seat,
        studentName: currentStudent,
        seatNumber: seat.dataset.seat,
        isManualSelection: true // 标记为手动选择
    });
    
    // 移动到下一个学生
    currentStudentIndex++;
    updateCurrentStudent();
    
    // 更新快速选择列表
    updateStudentList();
}

// 处理座位双击 - 修复顺序问题
function handleSeatDoubleClick(seat) {
    // 检查是否正在动画中
    if (isAnimating) return;
    
    // 检查座位是否为空
    if (!seat.classList.contains('occupied')) {
        return; // 如果座位为空，不做任何操作
    }
    
    // 获取当前座位上的学生
    const studentName = seat.textContent;
    
    // 记录清空操作到历史
    selectionHistory.push({
        type: 'clear',
        seatElement: seat,
        studentName: studentName,
        seatNumber: seat.dataset.seat
    });
    
    // 清空座位
    seat.textContent = seat.dataset.seat;
    seat.classList.remove('occupied');
    
    // 找到该学生在名单中的位置
    const studentIndex = studentList.indexOf(studentName);
    
    if (studentIndex !== -1) {
        // 从当前位置移除学生
        studentList.splice(studentIndex, 1);
        
        // 将学生插入到当前选择位置
        studentList.splice(currentStudentIndex, 0, studentName);
        
        // 更新当前学生显示
        updateCurrentStudent();
    }
}

// 修改混合模式最终确认方法，保持一致的样式处理
function finalizeHybridWithCurrentState(unoccupiedSeats, unassignedStudents, lastRandomState) {
    clearInterval(animationInterval);
    hideStopButton();
    isAnimating = false;
    shouldFinalizeWithCurrentState = false;
    
    console.log("混合模式最终确认：应用符合潜规则的分配");
    console.log("同桌定义：同一虚线框内的左右相邻座位");
    console.log("叶桂良座位规则：首选3、5、7、9，次选40、42、44、46");
    
    // 获取当前已分配的座位
    const occupiedSeats = Array.from(document.querySelectorAll('.seat')).filter(seat => 
        seat.classList.contains('occupied')
    );
    
    // 创建当前分配状态
    const currentAssignments = occupiedSeats.map(seat => ({
        seat: seat,
        student: seat.textContent
    }));
    
    // 尝试生成符合规则的随机分配
    let validAssignments = null;
    let attempts = 0;
    const maxAttempts = 10000; // 增加最大尝试次数，确保能找到符合复杂规则的分配
    
    console.log("开始尝试生成符合规则的混合分配...");
    console.log("严格执行叶桂良座位分配规则：首选3、5、7、9，次选40、42、44、46");
    
    // 检查当前已占用的首选和次选座位
    const occupiedSeatNumbers = occupiedSeats.map(seat => parseInt(seat.dataset.seat));
    const primarySeats = [3, 5, 7, 9];
    const secondarySeats = [40, 42, 44, 46];
    
    const occupiedPrimarySeats = primarySeats.filter(seatNum => 
        occupiedSeatNumbers.includes(seatNum) && 
        occupiedSeats.find(seat => parseInt(seat.dataset.seat) === seatNum).textContent !== '叶桂良'
    );
    
    const occupiedSecondarySeats = secondarySeats.filter(seatNum => 
        occupiedSeatNumbers.includes(seatNum) && 
        occupiedSeats.find(seat => parseInt(seat.dataset.seat) === seatNum).textContent !== '叶桂良'
    );
    
    // 计算可用的首选和次选座位
    const availablePrimarySeats = primarySeats.filter(seatNum => !occupiedPrimarySeats.includes(seatNum));
    const availableSecondarySeats = secondarySeats.filter(seatNum => !occupiedSecondarySeats.includes(seatNum));
    
    console.log(`已占用的首选座位: ${occupiedPrimarySeats.join(',')}`);
    console.log(`已占用的次选座位: ${occupiedSecondarySeats.join(',')}`);
    console.log(`可用的首选座位: ${availablePrimarySeats.join(',')}`);
    console.log(`可用的次选座位: ${availableSecondarySeats.join(',')}`);
    console.log("严格执行叶桂良座位分配规则");
    
    while (attempts < maxAttempts) {
        // 复制当前分配状态
        const testAssignments = [...currentAssignments];
        
        // 随机分配未分配的学生
        const shuffledStudents = shuffleArray([...unassignedStudents]);
        const randomAssignments = unoccupiedSeats.map((seat, index) => ({
            seat: seat,
            student: index < shuffledStudents.length ? shuffledStudents[index] : null
        }));
        
        // 合并当前分配和随机分配
        testAssignments.push(...randomAssignments);
        
        // 检查是否符合规则
        if (checkSeatingRules(testAssignments, false)) {
            validAssignments = randomAssignments;
            console.log(`找到符合规则的分配，尝试次数: ${attempts + 1}`);
            
            // 检查叶桂良的位置是否符合规则
            const yglAssignment = testAssignments.find(a => a.student === '叶桂良');
            if (yglAssignment) {
                const yglSeatNum = parseInt(yglAssignment.seat.dataset.seat);
                console.log(`叶桂良被分配到座位 ${yglSeatNum}`);
                
                // 验证分配是否符合规则
                if (availablePrimarySeats.length > 0 && !availablePrimarySeats.includes(yglSeatNum)) {
                    console.log(`警告：叶桂良应该分配到首选座位之一 ${availablePrimarySeats.join(',')}`);
                    continue; // 重新尝试
                } else if (availablePrimarySeats.length === 0 && availableSecondarySeats.length > 0 && !availableSecondarySeats.includes(yglSeatNum)) {
                    console.log(`警告：叶桂良应该分配到次选座位之一 ${availableSecondarySeats.join(',')}`);
                    continue; // 重新尝试
                }
            }
            
            break;
        }
        
        attempts++;
        
        // 每1000次尝试输出一次日志
        if (attempts % 1000 === 0) {
            console.log(`已尝试 ${attempts} 次，继续寻找符合规则的分配...`);
        }
    }
    
    // 如果找不到符合规则的分配，使用最后一次随机状态
    const finalAssignments = validAssignments || lastRandomState;
    
    if (!validAssignments) {
        console.log(`无法找到完全符合规则的混合分配，使用最后一次随机结果 (尝试次数: ${attempts})`);
    }
    
    // 应用最终分配
    finalAssignments.forEach(({seat, student}) => {
        if (student) {
            seat.textContent = student;
            seat.classList.remove('animating');
            seat.classList.add('occupied');
            seat.classList.add('no-color-change'); // 保持不变色
            
            // 如果是叶桂良，记录他的座位号
            if (student === '叶桂良') {
                lastYglSeatNum = parseInt(seat.dataset.seat);
                console.log(`混合模式记录叶桂良的座位号: ${lastYglSeatNum}`);
            }
        } else {
            seat.textContent = seat.dataset.seat;
            seat.classList.remove('animating');
            seat.classList.remove('occupied');
            seat.classList.remove('no-color-change');
        }
    });
    
    // 更新选择历史
    const newAssignments = finalAssignments.filter(({student}) => student);
    newAssignments.forEach(({seat, student}) => {
        selectionHistory.push({
            seatElement: seat,
            studentName: student,
            seatNumber: seat.dataset.seat,
            isManualSelection: false // 标记为随机选择
        });
    });
    
    currentStudentIndex = studentList.length;
    updateCurrentStudent();
    
    // 确保所有座位都可以拖拽
    enableAllSeatsDraggable();
}

// 完成混合分配（自动随机）
function finalizeHybridSelection(seats, randomCount) {
    clearInterval(animationInterval);
    hideStopButton();
    isAnimating = false;
    
    console.log("混合模式初始分配：应用符合潜规则的分配");
    console.log("同桌定义：同一虚线框内的左右相邻座位");
    console.log("叶桂良座位规则：首选3、5、7、9，次选40、42、44、46");
    
    // 将座位转为数组
    const availableSeats = Array.from(seats);
    
    // 尝试生成符合规则的随机分配
    let validAssignments = null;
    let attempts = 0;
    const maxAttempts = 10000; // 增加最大尝试次数，确保能找到符合复杂规则的分配
    
    console.log("开始尝试生成符合规则的混合分配...");
    
    while (attempts < maxAttempts) {
        // 随机打乱座位和学生
        const shuffledSeats = shuffleArray([...availableSeats]).slice(0, randomCount);
        const shuffledStudents = shuffleArray([...studentList.slice(0, randomCount)]);
        
        // 创建测试分配
        const testAssignments = shuffledSeats.map((seat, index) => ({
            seat: seat,
            student: shuffledStudents[index]
        }));
        
        // 检查是否符合规则
        if (checkSeatingRules(testAssignments, false)) {
            validAssignments = testAssignments;
            console.log(`找到符合规则的分配，尝试次数: ${attempts + 1}`);
            break;
        }
        
        attempts++;
        
        // 每1000次尝试输出一次日志
        if (attempts % 1000 === 0) {
            console.log(`已尝试 ${attempts} 次，继续寻找符合规则的分配...`);
        }
    }
    
    // 如果找不到符合规则的分配，使用最后一次随机结果
    if (!validAssignments) {
        console.log(`无法找到完全符合规则的混合分配，使用最后一次随机结果 (尝试次数: ${attempts})`);
        const shuffledSeats = shuffleArray([...availableSeats]).slice(0, randomCount);
        validAssignments = shuffledSeats.map((seat, index) => ({
            seat: seat,
            student: studentList[index]
        }));
    }
    
    // 清空选择历史
    selectionHistory = [];
    
    // 应用最终分配
    validAssignments.forEach(({seat, student}) => {
        seat.textContent = student;
        seat.classList.add('occupied');
        seat.classList.remove('animating');
        
        // 如果是叶桂良，记录他的座位号
        if (student === '叶桂良') {
            lastYglSeatNum = parseInt(seat.dataset.seat);
            console.log(`混合模式初始分配记录叶桂良的座位号: ${lastYglSeatNum}`);
        }
        
        // 记录分配历史
        selectionHistory.push({
            seatElement: seat,
            studentName: student,
            seatNumber: seat.dataset.seat,
            isManualSelection: false // 标记为随机选择
        });
    });
    
    // 更新当前学生索引
    currentStudentIndex = randomCount;
    updateCurrentStudent();
    
    // 更新快速选择列表
    updateStudentList();
    
    // 重新添加拖拽事件，确保随机分配的座位也可以交换
    addSeatDragListeners();
    
    alert(`已随机分配 ${randomCount} 名学生的座位，剩余 ${studentList.length - randomCount} 名学生可手动选择`);
}

// 撤销上一步选择
function undoLastSelection() {
    if (selectionHistory.length === 0) {
        alert('没有可撤销的操作');
        return;
    }
    
    const lastSelection = selectionHistory.pop();
    
    // 处理清空操作撤销
    if (lastSelection.type === 'clear') {
        const seat = lastSelection.seatElement;
        const studentName = lastSelection.studentName;
        
        // 恢复座位
        seat.textContent = studentName;
        seat.classList.add('occupied');
        
        // 从当前选择位置移除该学生
        const studentIndex = studentList.indexOf(studentName);
        if (studentIndex !== -1) {
            studentList.splice(studentIndex, 1);
        }
        
        alert(`已撤销清空 ${studentName} 的座位`);
        return;
    }
    
    // 处理交换撤销
    if (lastSelection.type === 'swap') {
        // 交换回来
        const seat1 = lastSelection.seat1;
        const seat2 = lastSelection.seat2;
        const student1 = lastSelection.student1;
        const student2 = lastSelection.student2;
        
        seat1.textContent = student1;
        if (student1 !== seat1.dataset.seat) {
            seat1.classList.add('occupied');
        } else {
            seat1.classList.remove('occupied');
        }
        
        seat2.textContent = student2;
        if (student2 !== seat2.dataset.seat) {
            seat2.classList.add('occupied');
        } else {
            seat2.classList.remove('occupied');
        }
        
        alert(`已撤销座位交换操作`);
        return;
    }
    
    // 处理普通座位分配撤销
    const seat = lastSelection.seatElement;
    
    // 恢复座位号
    seat.textContent = seat.dataset.seat;
    seat.classList.remove('occupied');
    
    // 返回到上一个学生
    currentStudentIndex--;
    updateCurrentStudent();
    
    // 更新快速选择列表
    updateStudentList();
}

// 导出座位表为图片
function exportSeatingChart() {
    const classroom = document.getElementById('classroom');
    
    html2canvas(classroom, {
        backgroundColor: '#ffffff',
        scale: 2, // 提高清晰度
    }).then(canvas => {
        // 创建下载链接
        const link = document.createElement('a');
        link.download = '座位表.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(error => {
        console.error('导出失败:', error);
        alert('导出座位表失败，请稍后重试');
    });
}

// 辅助函数：洗牌数组
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 混合模式：部分手动选择后随机分配
function hybridSelection() {
    if (studentList.length === 0) {
        alert('请先导入名单');
        return;
    }
    
    // 获取已占用和未占用的座位
    const seats = document.querySelectorAll('.seat');
    const occupiedSeats = Array.from(seats).filter(seat => seat.classList.contains('occupied'));
    const unoccupiedSeats = Array.from(seats).filter(seat => !seat.classList.contains('occupied'));
    
    // 获取未分配的学生
    const assignedStudents = occupiedSeats.map(seat => seat.textContent);
    const unassignedStudents = studentList.filter(student => !assignedStudents.includes(student));
    
    if (unassignedStudents.length === 0) {
        alert('所有学生已分配座位');
        return;
    }
    
    if (unassignedStudents.length > unoccupiedSeats.length) {
        alert('剩余座位不足');
        return;
    }

    // 清除之前可能存在的动画
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    // 开始随机动画
    showStopButton();
    isAnimating = true;
    shouldFinalizeWithCurrentState = false;
    
    // 确保当前模式为混合模式
    currentMode = 'hybrid';
    
    console.log("开始混合模式随机分配...");
    console.log("同桌定义：同一虚线框内的左右相邻座位");
    console.log("徐康和张涵同桌概率：99.5%");
    console.log("叶桂良座位分配规则：");
    console.log("  - 首选座位：3、5、7、9号位置（按优先级排序）");
    console.log("  - 若首选座位都被占用，则只能在40、42、44、46号位置");
    console.log("  - 若8个位置都被占用，则不能在第一行和最后两排");
    console.log("叶桂良不能与特定同学同桌");
    console.log("唐浩和杨雨霏不能同桌");
    console.log("空位只能在最后一排");
    
    // 检查当前已占用的首选和次选座位
    const occupiedSeatNumbers = occupiedSeats.map(seat => parseInt(seat.dataset.seat));
    const primarySeats = [3, 5, 7, 9];
    const secondarySeats = [40, 42, 44, 46];
    
    const occupiedPrimarySeats = primarySeats.filter(seatNum => 
        occupiedSeatNumbers.includes(seatNum) && 
        occupiedSeats.find(seat => parseInt(seat.dataset.seat) === seatNum).textContent !== '叶桂良'
    );
    
    const occupiedSecondarySeats = secondarySeats.filter(seatNum => 
        occupiedSeatNumbers.includes(seatNum) && 
        occupiedSeats.find(seat => parseInt(seat.dataset.seat) === seatNum).textContent !== '叶桂良'
    );
    
    // 计算可用的首选和次选座位
    const availablePrimarySeats = primarySeats.filter(seatNum => !occupiedPrimarySeats.includes(seatNum));
    const availableSecondarySeats = secondarySeats.filter(seatNum => !occupiedSecondarySeats.includes(seatNum));
    
    console.log(`已占用的首选座位: ${occupiedPrimarySeats.join(',')}`);
    console.log(`已占用的次选座位: ${occupiedSecondarySeats.join(',')}`);
    console.log(`可用的首选座位: ${availablePrimarySeats.join(',')}`);
    console.log(`可用的次选座位: ${availableSecondarySeats.join(',')}`);
    console.log("严格执行叶桂良座位分配规则");
    
    // 标记未占用座位为动画状态
    unoccupiedSeats.forEach(seat => {
        seat.textContent = seat.dataset.seat;
        seat.classList.add('animating');
    });
    
    // 存储最后一次随机状态
    let lastRandomState = [];
    let animationFrames = 0;
    const totalAnimationFrames = 300; // 增加动画总帧数，让用户有足够时间手动停止
    
    animationInterval = setInterval(() => {
        // 如果用户手动停止或达到最大帧数
        if (shouldFinalizeWithCurrentState || animationFrames >= totalAnimationFrames) {
            clearInterval(animationInterval);
            finalizeHybridWithCurrentState(unoccupiedSeats, unassignedStudents, lastRandomState);
            return;
        }
        
        // 动画过程中使用完全随机的分配，不检查规则，保持随机效果
        const shuffledStudents = shuffleArray([...unassignedStudents]);
        lastRandomState = unoccupiedSeats.map((seat, index) => ({
            seat: seat,
            student: index < shuffledStudents.length ? shuffledStudents[index] : null
        }));
        
        // 更新动画显示
        lastRandomState.forEach(({seat, student}) => {
            if (student) {
                seat.textContent = student;
            } else {
                seat.textContent = seat.dataset.seat;
            }
        });
        
        animationFrames++;
    }, 100);
}

// 添加CSS样式以增强拖拽体验
function addDragStyles() {
    // 检查是否已存在样式
    if (document.getElementById('dragStyles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'dragStyles';
    styleElement.textContent = `
        .seat.dragging {
            opacity: 0.7;
            transform: scale(1.05);
            box-shadow: 0 10px 25px rgba(52, 152, 219, 0.35);
            z-index: 10;
        }
        
        .seat.dragover {
            border: 2px dashed var(--primary-color);
            background-color: rgba(52, 152, 219, 0.1);
            transform: scale(1.05);
        }
    `;
    
    document.head.appendChild(styleElement);
}

// 新增函数：确保所有座位都可以拖拽
function enableAllSeatsDraggable() {
    const seats = document.querySelectorAll('.seat');
    
    seats.forEach(seat => {
        // 移除可能存在的旧事件监听器
        if (seat.dragStartHandler) {
            seat.removeEventListener('dragstart', seat.dragStartHandler);
        }
        if (seat.dragOverHandler) {
            seat.removeEventListener('dragover', seat.dragOverHandler);
        }
        if (seat.dragLeaveHandler) {
            seat.removeEventListener('dragleave', seat.dragLeaveHandler);
        }
        if (seat.dropHandler) {
            seat.removeEventListener('drop', seat.dropHandler);
        }
        
        // 为所有座位添加拖拽相关的样式和属性
        seat.style.cursor = 'move';
        seat.setAttribute('draggable', true);
        
        // 定义拖拽开始处理函数
        seat.dragStartHandler = function(e) {
            // 只有有学生的座位可以开始拖拽
            if (!this.classList.contains('occupied')) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('text/plain', this.textContent);
            this.classList.add('dragging');
            firstSelectedSeat = this;
        };
        
        // 定义拖拽经过处理函数
        seat.dragOverHandler = function(e) {
            e.preventDefault();
            if (!firstSelectedSeat) return;
            
            // 添加视觉反馈
            this.classList.add('dragover');
        };
        
        // 定义拖拽离开处理函数
        seat.dragLeaveHandler = function(e) {
            // 移除视觉反馈
            this.classList.remove('dragover');
        };
        
        // 定义放置处理函数
        seat.dropHandler = function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            if (!firstSelectedSeat) return;
            
            const draggedText = firstSelectedSeat.textContent;
            const targetText = this.textContent;
            
            // 记录交换历史
            selectionHistory.push({
                type: 'swap',
                seat1: firstSelectedSeat,
                seat2: this,
                student1: draggedText,
                student2: targetText
            });
            
            // 如果目标位置是空的，则只移动学生，原位置变为空
            if (!this.classList.contains('occupied')) {
                // 设置新位置
                this.textContent = draggedText;
                this.classList.add('occupied');
                
                // 清空原位置
                firstSelectedSeat.textContent = firstSelectedSeat.dataset.seat;
                firstSelectedSeat.classList.remove('occupied');
            } else {
                // 如果目标位置有学生，则交换
                firstSelectedSeat.textContent = targetText;
                this.textContent = draggedText;
            }
            
            firstSelectedSeat.classList.remove('dragging');
            firstSelectedSeat = null;
        };
        
        // 添加事件监听器
        seat.addEventListener('dragstart', seat.dragStartHandler);
        seat.addEventListener('dragover', seat.dragOverHandler);
        seat.addEventListener('dragleave', seat.dragLeaveHandler);
        seat.addEventListener('drop', seat.dropHandler);
    });
}

// 切换修改位置状态
let isEditPositionMode = false;
function toggleEditPositionMode() {
    isEditPositionMode = !isEditPositionMode;
    
    // 更新按钮文本
    const editButtons = document.querySelectorAll('.edit-position-btn');
    editButtons.forEach(btn => {
        btn.textContent = isEditPositionMode ? '退出修改状态' : '修改位置状态';
        btn.classList.toggle('active', isEditPositionMode);
    });
    
    // 更新座位状态
    const seats = document.querySelectorAll('.seat');
    if (isEditPositionMode) {
        // 进入修改位置状态
        seats.forEach(seat => {
            // 保存原始状态
            seat.dataset.originalDraggable = seat.getAttribute('draggable');
            
            // 所有座位都可以拖拽
            seat.setAttribute('draggable', true);
            seat.style.cursor = 'move';
            
            // 添加编辑状态样式
            seat.classList.add('edit-mode');
        });
        
        // 显示提示信息
        showNotification('已进入修改位置状态，所有座位可以自由交换');
    } else {
        // 退出修改位置状态
        seats.forEach(seat => {
            // 恢复原始状态
            if (seat.dataset.originalDraggable === 'false' && !seat.classList.contains('occupied')) {
                seat.setAttribute('draggable', false);
                seat.style.cursor = 'pointer';
            }
            
            // 移除编辑状态样式
            seat.classList.remove('edit-mode');
        });
        
        // 显示提示信息
        showNotification('已退出修改位置状态');
    }
    
    // 更新拖拽事件处理
    updateDragHandlers();
}

// 更新拖拽事件处理函数
function updateDragHandlers() {
    const seats = document.querySelectorAll('.seat');
    
    seats.forEach(seat => {
        // 移除可能存在的旧事件监听器
        if (seat.dragStartHandler) {
            seat.removeEventListener('dragstart', seat.dragStartHandler);
        }
        if (seat.dragOverHandler) {
            seat.removeEventListener('dragover', seat.dragOverHandler);
        }
        if (seat.dragLeaveHandler) {
            seat.removeEventListener('dragleave', seat.dragLeaveHandler);
        }
        if (seat.dropHandler) {
            seat.removeEventListener('drop', seat.dropHandler);
        }
        
        // 定义拖拽开始处理函数
        seat.dragStartHandler = function(e) {
            // 在修改位置状态下，所有座位都可以拖拽
            // 在正常状态下，只有有学生的座位可以拖拽
            if (!isEditPositionMode && !this.classList.contains('occupied')) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('text/plain', this.textContent);
            this.classList.add('dragging');
            firstSelectedSeat = this;
        };
        
        // 定义拖拽经过处理函数
        seat.dragOverHandler = function(e) {
            e.preventDefault();
            if (!firstSelectedSeat) return;
            
            // 添加视觉反馈
            this.classList.add('dragover');
        };
        
        // 定义拖拽离开处理函数
        seat.dragLeaveHandler = function(e) {
            // 移除视觉反馈
            this.classList.remove('dragover');
        };
        
        // 定义放置处理函数
        seat.dropHandler = function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            if (!firstSelectedSeat) return;
            
            const draggedText = firstSelectedSeat.textContent;
            const targetText = this.textContent;
            
            // 记录交换历史
            selectionHistory.push({
                type: 'swap',
                seat1: firstSelectedSeat,
                seat2: this,
                student1: draggedText,
                student2: targetText
            });
            
            // 处理座位交换
            if (isEditPositionMode) {
                // 在修改位置状态下，直接交换内容和状态
                const isSource = firstSelectedSeat.classList.contains('occupied');
                const isTarget = this.classList.contains('occupied');
                
                // 交换内容
                firstSelectedSeat.textContent = targetText;
                this.textContent = draggedText;
                
                // 交换状态
                if (isSource && !isTarget) {
                    // 源有学生，目标无学生
                    firstSelectedSeat.classList.remove('occupied');
                    this.classList.add('occupied');
                    this.classList.add('no-color-change'); // 保持不变色
                } else if (!isSource && isTarget) {
                    // 源无学生，目标有学生
                    firstSelectedSeat.classList.add('occupied');
                    firstSelectedSeat.classList.add('no-color-change'); // 保持不变色
                    this.classList.remove('occupied');
                }
                // 如果两者状态相同，则不需要改变
            } else {
                // 在正常状态下，按原逻辑处理
                if (!this.classList.contains('occupied')) {
                    // 设置新位置
                    this.textContent = draggedText;
                    this.classList.add('occupied');
                    this.classList.add('no-color-change'); // 保持不变色
                    
                    // 清空原位置
                    firstSelectedSeat.textContent = firstSelectedSeat.dataset.seat;
                    firstSelectedSeat.classList.remove('occupied');
                    firstSelectedSeat.classList.remove('no-color-change');
                } else {
                    // 如果目标位置有学生，则交换
                    firstSelectedSeat.textContent = targetText;
                    this.textContent = draggedText;
                }
            }
            
            firstSelectedSeat.classList.remove('dragging');
            firstSelectedSeat = null;
        };
        
        // 添加事件监听器
        seat.addEventListener('dragstart', seat.dragStartHandler);
        seat.addEventListener('dragover', seat.dragOverHandler);
        seat.addEventListener('dragleave', seat.dragLeaveHandler);
        seat.addEventListener('drop', seat.dropHandler);
    });
}

// 显示通知
function showNotification(message) {
    // 检查是否已存在通知元素
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    // 设置通知内容和样式
    notification.textContent = message;
    notification.className = 'notification show';
    
    // 添加通知样式
    addNotificationStyles();
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// 添加通知样式
function addNotificationStyles() {
    // 检查是否已存在样式
    if (document.getElementById('notificationStyles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'notificationStyles';
    styleElement.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(52, 152, 219, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: bold;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        
        .notification.show {
            opacity: 1;
        }
        
        .edit-mode {
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.5);
        }
        
        .edit-position-btn.active {
            background-color: var(--primary-color);
            color: white;
        }
    `;
    
    document.head.appendChild(styleElement);
}

// 修改页面加载事件，删除重新开始按钮，添加修改位置状态按钮
document.addEventListener('DOMContentLoaded', function() {
    // 初始化座位点击事件
    addSeatClickListeners();
    
    // 初始化座位拖拽事件
    enableAllSeatsDraggable();
    
    // 初始化模式切换按钮
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.id.replace('Mode', '');
            switchMode(mode);
        });
    });
    
    // 初始化随机模式按钮
    const randomAllBtn = document.getElementById('randomizeAll');
    if (randomAllBtn) {
        randomAllBtn.addEventListener('click', randomizeAllSeats);
    }
    
    // 初始化混合模式按钮
    const hybridBtn = document.getElementById('hybridSelection');
    if (hybridBtn) {
        hybridBtn.addEventListener('click', hybridSelection);
    }
    
    // 初始化停止动画按钮
    const stopButton = document.getElementById('stopAnimation');
    if (stopButton) {
        stopButton.addEventListener('click', stopAnimation);
    }
    
    // 添加修改位置状态按钮到随机模式和混合模式
    addEditPositionButton();
    
    // 添加拖拽样式
    addDragStyles();
});

// 添加修改位置状态按钮
function addEditPositionButton() {
    // 为随机模式添加修改位置状态按钮
    const randomControls = document.getElementById('randomControls');
    if (randomControls) {
        const editPositionBtnRandom = document.createElement('button');
        editPositionBtnRandom.textContent = '修改位置状态';
        editPositionBtnRandom.id = 'editPositionRandom';
        editPositionBtnRandom.className = 'edit-position-btn';
        editPositionBtnRandom.onclick = toggleEditPositionMode;
        randomControls.appendChild(editPositionBtnRandom);
    }
    
    // 为混合模式添加修改位置状态按钮
    const hybridControls = document.getElementById('hybridControls');
    if (hybridControls) {
        const editPositionBtnHybrid = document.createElement('button');
        editPositionBtnHybrid.textContent = '修改位置状态';
        editPositionBtnHybrid.id = 'editPositionHybrid';
        editPositionBtnHybrid.className = 'edit-position-btn';
        editPositionBtnHybrid.onclick = toggleEditPositionMode;
        hybridControls.appendChild(editPositionBtnHybrid);
    }
}

// 混合模式下重新随机未分配的座位
function reRandomizeHybrid() {
    if (studentList.length === 0) {
        alert('请先导入名单');
        return;
    }
    
    console.log("开始混合模式重新随机...");
    console.log("同桌定义：同一虚线框内的左右相邻座位");
    console.log("徐康和张涵同桌概率：99.5%");
    console.log("叶桂良座位分配规则：");
    console.log("  - 首选座位：3、5、7、9号位置（按优先级排序）");
    console.log("  - 若首选座位都被占用，则只能在40、42、44、46号位置");
    console.log("  - 若8个位置都被占用，则不能在第一行和最后两排");
    console.log("叶桂良不能与特定同学同桌");
    console.log("唐浩和杨雨霏不能同桌");
    console.log("空位只能在最后一排");
    console.log("叶桂良每两次的结果不相同");
    
    // 获取所有座位
    const seats = document.querySelectorAll('.seat');
    
    // 找出手动选择的座位（保留在selectionHistory中的前几个记录）
    // 注意：在混合模式下，手动选择的座位是在随机分配之后添加的
    const manualSelections = [];
    const randomSelections = [];
    
    // 遍历所有已占用的座位，区分手动选择和随机分配
    Array.from(seats).filter(seat => seat.classList.contains('occupied')).forEach(seat => {
        // 清除所有随机分配的座位，只保留手动选择的座位
        const seatNum = seat.dataset.seat;
        const student = seat.textContent;
        
        // 检查是否是手动选择的座位
        const isManualSelection = selectionHistory.some(history => 
            history.seatNumber === seatNum && 
            history.studentName === student && 
            history.isManualSelection === true
        );
        
        if (isManualSelection) {
            // 保留手动选择的座位
            manualSelections.push({
                seat: seat,
                student: student
            });
        } else {
            // 清除随机分配的座位
            seat.textContent = seat.dataset.seat;
            seat.classList.remove('occupied');
            seat.classList.remove('no-color-change');
            randomSelections.push({
                seat: seat,
                student: student
            });
        }
    });
    
    // 获取未占用的座位
    const unoccupiedSeats = Array.from(seats).filter(seat => !seat.classList.contains('occupied'));
    
    // 获取已分配和未分配的学生
    const assignedStudents = manualSelections.map(selection => selection.student);
    const unassignedStudents = studentList.filter(student => !assignedStudents.includes(student));
    
    if (unassignedStudents.length === 0) {
        alert('所有学生已分配座位');
        return;
    }
    
    if (unassignedStudents.length > unoccupiedSeats.length) {
        alert('剩余座位不足');
        return;
    }
    
    // 清除之前可能存在的动画
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    // 开始随机动画
    showStopButton();
    isAnimating = true;
    shouldFinalizeWithCurrentState = false;
    
    // 标记未占用座位为动画状态
    unoccupiedSeats.forEach(seat => {
        seat.textContent = seat.dataset.seat;
        seat.classList.add('animating');
    });
    
    // 存储最后一次随机状态
    let lastRandomState = [];
    let animationFrames = 0;
    const totalAnimationFrames = 300; // 动画总帧数
    
    // 设置当前模式为混合模式，确保应用正确的规则
    currentMode = 'hybrid';
    console.log("重新随机: 设置当前模式为混合模式");
    console.log("严格执行叶桂良座位分配规则：首选3、5、7、9，次选40、42、44、46");
    
    // 检查当前已占用的首选和次选座位
    const occupiedSeatNumbers = manualSelections.map(selection => parseInt(selection.seat.dataset.seat));
    const primarySeats = [3, 5, 7, 9];
    const secondarySeats = [40, 42, 44, 46];
    
    const occupiedPrimarySeats = primarySeats.filter(seatNum => 
        occupiedSeatNumbers.includes(seatNum) && 
        manualSelections.find(selection => parseInt(selection.seat.dataset.seat) === seatNum).student !== '叶桂良'
    );
    
    const occupiedSecondarySeats = secondarySeats.filter(seatNum => 
        occupiedSeatNumbers.includes(seatNum) && 
        manualSelections.find(selection => parseInt(selection.seat.dataset.seat) === seatNum).student !== '叶桂良'
    );
    
    // 计算可用的首选和次选座位
    const availablePrimarySeats = primarySeats.filter(seatNum => !occupiedPrimarySeats.includes(seatNum));
    const availableSecondarySeats = secondarySeats.filter(seatNum => !occupiedSecondarySeats.includes(seatNum));
    
    console.log(`已占用的首选座位: ${occupiedPrimarySeats.join(',')}`);
    console.log(`已占用的次选座位: ${occupiedSecondarySeats.join(',')}`);
    console.log(`可用的首选座位: ${availablePrimarySeats.join(',')}`);
    console.log(`可用的次选座位: ${availableSecondarySeats.join(',')}`);
    console.log("严格执行叶桂良座位分配规则");
    
    animationInterval = setInterval(() => {
        // 如果用户手动停止或达到最大帧数
        if (shouldFinalizeWithCurrentState || animationFrames >= totalAnimationFrames) {
            clearInterval(animationInterval);
            finalizeHybridWithCurrentState(unoccupiedSeats, unassignedStudents, lastRandomState);
            return;
        }
        
        // 动画过程中使用完全随机的分配，不检查规则，保持随机效果
        const shuffledStudents = shuffleArray([...unassignedStudents]);
        lastRandomState = unoccupiedSeats.map((seat, index) => ({
            seat: seat,
            student: index < shuffledStudents.length ? shuffledStudents[index] : null
        }));
        
        // 更新动画显示
        lastRandomState.forEach(({seat, student}) => {
            if (student) {
                seat.textContent = student;
            } else {
                seat.textContent = seat.dataset.seat;
            }
        });
        
        animationFrames++;
    }, 100);
} 